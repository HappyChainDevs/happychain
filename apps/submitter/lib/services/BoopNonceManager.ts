import { type Hash, Map2, Mutex, promiseWithResolvers } from "@happy.tech/common"
import type { Address } from "viem/accounts"
import { abis, env } from "#lib/env"
import type { PendingBoopInfo } from "#lib/handlers/getPending"
import type { SubmitError } from "#lib/handlers/submit"
import { type Boop, SubmitterError, type SubmitterErrorStatus } from "#lib/types"
import { publicClient } from "#lib/utils/clients"
import { logger } from "#lib/utils/logger"
import { computeHash } from "../utils/boop/computeHash"

type NonceTrack = bigint
type NonceValue = bigint
type PendingBoop = { boopHash: Hash; resolve: (value: undefined | SubmitError) => void }

// TODO the nonce manager should also key on the entryPoint

export class BoopNonceManager {
    #usedCapacity: bigint
    readonly #nonceMutexes: Map2<Address, NonceTrack, Mutex>
    readonly #nonces: Map2<Address, NonceTrack, NonceValue>
    readonly #pendingBoopsMap: Map2<Address, NonceTrack, Map<NonceValue, PendingBoop>>

    // Invariant: `#nonces.get(account, nonceTrack)` and `#pendingBoopsMaps.get(account, nonceTrack)`
    // are both undefined or defined at the same time.

    constructor() {
        this.#usedCapacity = 0n
        this.#nonceMutexes = new Map2()
        this.#nonces = new Map2()
        this.#pendingBoopsMap = new Map2()
    }

    /**
     * Returns all blocked (queued) Boops for a given account. These
     */
    getPendingBoops(account: Address): PendingBoopInfo[] {
        const pending = this.#pendingBoopsMap.getAll(account)
        if (!pending) return []
        return Array.from(pending.entries()).flatMap(([nonceTrack, txMap]) => {
            return Array.from(txMap.entries()).flatMap(([nonceValue, tx]) => {
                return {
                    nonceTrack,
                    nonceValue,
                    boopHash: tx.boopHash,
                    submitted: false,
                } satisfies PendingBoopInfo
            })
        })
    }

    /**
     * Used to set the nonce after a simulation succeds without indicating a future nonce.
     * This will only increase the nonce, never decrease it as we might already have submitted
     * (in case of a replacement boop).
     *
     * TODO think more about user-initiated replacement and their consequences
     */
    hintNonce(account: Address, nonceTrack: NonceTrack, nonceValue: NonceValue): void {
        const currentNonce = this.#nonces.get(account, nonceTrack)
        if (currentNonce && nonceValue > currentNonce) {
            this.#nonces.set(account, nonceTrack, nonceValue)
            setTimeout(() => this.#pruneNonce(account, nonceTrack), env.MAX_SUBMIT_PENDING_TIME)
        }
    }

    /**
     * Removes a nonce binding for an (account, nonceTrack) pair if it is safe to do so (no more blocked
     * boops for the pair). If a nonceValue is provided, unconditionally removes the boop blocked on it.
     */
    #pruneNonce(account: Address, nonceTrack: NonceTrack, nonceValue?: NonceValue) {
        const track = this.#pendingBoopsMap.get(account, nonceTrack)
        if (track && nonceValue) track.delete(nonceValue)
        if (track?.size === 0) {
            this.#pendingBoopsMap.delete(account, nonceTrack)
            this.#nonces.delete(account, nonceTrack)
            this.#nonceMutexes.delete(account, nonceTrack)
        }
    }

    async waitUntilUnblocked(entryPoint: Address, boop: Boop): Promise<undefined | SubmitError> {
        const { account, nonceTrack, nonceValue } = boop
        const localNonce = await this.#getLocalNonce(entryPoint, account, nonceTrack)

        // Not pending anymore, proceed immediately.
        if (nonceValue === localNonce) return

        // Check if we can wait for the nonce.
        const trackSize = this.#pendingBoopsMap.get(boop.account, boop.nonceTrack)?.size ?? 0
        if (trackSize >= env.MAX_PENDING_PER_TRACK) {
            return this.#makeSubmitError(SubmitterError.BufferExceeded)
        }
        if (this.#usedCapacity >= env.MAX_TOTAL_PENDING) {
            return this.#makeSubmitError(SubmitterError.OverCapacity)
        }
        if (nonceValue >= localNonce + BigInt(env.MAX_PENDING_PER_TRACK)) {
            return this.#makeSubmitError(SubmitterError.NonceTooFarAhead)
        }

        // If an old boop exists for the nonce, signal that it has been replaced.
        const previouslyBlocked = this.#pendingBoopsMap.get(account, nonceTrack)?.get(nonceValue)
        console.log("previouslyBlocked", previouslyBlocked)
        if (previouslyBlocked) previouslyBlocked.resolve(this.#makeSubmitError(SubmitterError.BoopReplaced))

        const boopHash = computeHash(boop)
        const { promise, resolve } = promiseWithResolvers<undefined | SubmitError>()
        const timeout = setTimeout(() => {
            logger.trace("Timed out while waiting to process pending boop", boopHash)
            this.#pruneNonce(account, nonceTrack, nonceValue)
            resolve(this.#makeSubmitError(SubmitterError.SubmitTimeout))
        }, env.MAX_SUBMIT_PENDING_TIME)

        this.#pendingBoopsMap
            .getOrSet(account, nonceTrack, () => new Map())
            .set(nonceValue, {
                boopHash,
                resolve: (response: undefined | SubmitError) => {
                    clearTimeout(timeout)
                    this.#pruneNonce(account, nonceTrack, nonceValue)
                    resolve(response)
                },
            })

        this.#usedCapacity++
        return await promise
    }

    #makeSubmitError(status: SubmitterErrorStatus): SubmitError {
        let description = ""
        switch (status) {
            case SubmitterError.BufferExceeded:
                description = "Buffer full for this (account, nonceTrack) pair. Try again later."
                break
            case SubmitterError.OverCapacity:
                description = "The submitter has reached its maximum capacity. Try again later."
                break
            case SubmitterError.SubmitTimeout:
                description = "Boop submission timed out — the boop's nonce is ahead of the latest known nonce."
                break
            case SubmitterError.NonceTooFarAhead:
                description = "The supplied nonce is too far ahead of the current nonce value."
                break
            case SubmitterError.BoopReplaced:
                description = "The boop has been replaced by a newer boop."
                break
            case SubmitterError.ExternalSubmit:
                description = "Boop was submitted onchain by another submitter or entity."
                break
        }
        return { status, description, stage: "submit" }
    }

    /**
     * Increments the local nonce for the account and nonceTrack, unblocking a pending boop if necessary.
     */
    public incrementLocalNonce(boop: Boop): void {
        const { account, nonceTrack, nonceValue } = boop
        this.#usedCapacity--
        const nextNonce = nonceValue + 1n
        this.#setLocalNonce(account, nonceTrack, nextNonce)
    }

    #setLocalNonce(account: Address, nonceTrack: NonceTrack, nonceValue: NonceValue): void {
        this.#nonces.set(account, nonceTrack, nonceValue)
        const pendingBoop = this.#pendingBoopsMap.get(account, nonceTrack)?.get(nonceValue)
        if (!pendingBoop) return
        pendingBoop.resolve(undefined)
    }

    async #getLocalNonce(entryPoint: Address, account: Address, nonceTrack: NonceTrack): Promise<NonceValue> {
        const mutex = this.#nonceMutexes.getOrSet(account, nonceTrack, () => new Mutex())
        return await mutex.locked(async () => {
            return await this.#nonces.getOrSetAsync(
                account,
                nonceTrack,
                async () => await this.#getOnchainNonce(entryPoint, account, nonceTrack),
            )
        })
    }

    async #getOnchainNonce(entryPoint: Address, account: Address, nonceTrack: NonceTrack): Promise<NonceValue> {
        return await publicClient.readContract({
            address: entryPoint,
            abi: abis.EntryPoint,
            functionName: "nonceValues",
            args: [account, nonceTrack],
        })
    }

    /**
     * Refetches the onchain nonce, and if it has run ahead of the local nonce, updates to that value (making sure
     * to invalidate all blocked boops in the process). Called whenever we detect a nonce too low during simulation.
     */
    async resyncNonce(entryPoint: Address, account: Address, nonceTrack: NonceTrack): Promise<void> {
        // No boop pending on the track, so no local nonce managed, no point to resync.
        if (!this.#pendingBoopsMap.get(account, nonceTrack)) return

        const onchainNonce = await this.#getOnchainNonce(entryPoint, account, nonceTrack)
        // Recheck after await.
        const pendingMap = this.#pendingBoopsMap.get(account, nonceTrack)
        if (!pendingMap) return

        const localNonce = this.#nonces.get(account, nonceTrack)
        if (!localNonce) throw Error("BUG: resyncNonce") // cf. invariant
        if (onchainNonce > localNonce) {
            logger.trace("Onchain nonce is ahead of local nonce — resyncing.", account, nonceTrack)
            this.#setLocalNonce(account, nonceTrack, onchainNonce)
            // biome-ignore format: keep on one line
            const pending = pendingMap.entries().toArray().sort(([nonceA], [nonceB]) => Number(nonceA - nonceB)) ?? []
            for (const [nonceValue, pendingBoop] of pending) {
                // Only consider pending nonces smaller than the new nonce — the `]localNonce, onchainNonce[` range.
                if (nonceValue <= localNonce) continue
                if (nonceValue >= onchainNonce) break
                pendingBoop.resolve(this.#makeSubmitError(SubmitterError.ExternalSubmit))
                this.#pruneNonce(account, nonceTrack, nonceValue)
            }
        }
    }
}
