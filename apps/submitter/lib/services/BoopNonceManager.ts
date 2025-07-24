import { type Hash, Map2, Mutex, promiseWithResolvers } from "@happy.tech/common"
import type { Address } from "viem/accounts"
import { abis, env } from "#lib/env"
import type { SubmitError } from "#lib/handlers/submit"
import { TraceMethod } from "#lib/telemetry/traces"
import { type Boop, SubmitterError, type SubmitterErrorStatus } from "#lib/types"
import { computeHash } from "#lib/utils/boop/computeHash"
import { logger } from "#lib/utils/logger"
import { publicClient } from "./clients"

type NonceTrack = bigint
type NonceValue = bigint
type BlockedBoop = { boopHash: Hash; resolve: (value: undefined | SubmitError) => void }

// TODO the nonce manager should also key on the entryPoint

export class BoopNonceManager {
    #usedCapacity: bigint
    readonly #nonceMutexes: Map2<Address, NonceTrack, Mutex>
    readonly #nonces: Map2<Address, NonceTrack, NonceValue>
    readonly #blockedBoopsMap: Map2<Address, NonceTrack, Map<NonceValue, BlockedBoop>>

    constructor() {
        this.#usedCapacity = 0n
        this.#nonceMutexes = new Map2()
        this.#nonces = new Map2()
        this.#blockedBoopsMap = new Map2()
    }

    /** Returns true if the boop (identifier by account/nonceTrack/nonceValue only) is currently blocked. */
    @TraceMethod("BoopNonceManager.has")
    has(boop: Boop): boolean {
        return this.#blockedBoopsMap.get(boop.account, boop.nonceTrack)?.has(boop.nonceValue) ?? false
    }

    /**
     * Used to ensure that a nonce is at least as high as the provided value. This will never decrease the local nonce,
     * as we might already have submitted boops with nonces within `]nonceValue, localNonce[`.
     *
     * This is called:
     * - After a simulation succeds without indicating a future nonce.
     * - Whenever we get a receipt for a boop.
     */
    @TraceMethod("BoopNonceManager.hintNonce")
    hintNonce(account: Address, nonceTrack: NonceTrack, nonceValue: NonceValue): void {
        const currentNonce = this.#nonces.get(account, nonceTrack)
        if (currentNonce && nonceValue <= currentNonce) return
        this.setLocalNonce(account, nonceTrack, nonceValue)
        setTimeout(() => this.pruneNonce(account, nonceTrack), env.MAX_BLOCKED_TIME)
    }

    /**
     * Resets the nonce to the given value if currently tracked and higher.
     *
     * We call this when we move to cancel a boop transaction. It's possible that the boop will still get included, in
     * which case {@link hintNonce} *might* be called to fix the situation — otherwise blocked nonces will time out.
     */
    @TraceMethod("BoopNonceManager.handleCancelledNonce")
    resetNonce(account: Address, nonceTrack: NonceTrack, nonceValue: NonceValue): void {
        const currentNonce = this.#nonces.get(account, nonceTrack)
        if (!currentNonce || currentNonce <= nonceValue) return
        this.setLocalNonce(account, nonceTrack, nonceValue)
        setTimeout(() => this.pruneNonce(account, nonceTrack), env.MAX_BLOCKED_TIME)
    }

    /**
     * Indicates whether the boop is blocked, i.e. unable to be submitted until we've submitted boops for all nonces
     * below it. This also returns true if the nonce is currently unknown.
     */
    @TraceMethod("BoopNonceManager.isBlocked")
    isBlocked(boop: Boop): boolean {
        const currentNonce = this.#nonces.get(boop.account, boop.nonceTrack)
        return currentNonce === undefined || currentNonce < boop.nonceValue
    }

    /**
     * Removes a nonce binding for an (account, nonceTrack) pair if it is safe to do so (no more blocked
     * boops for the pair). If a nonceValue is provided, unconditionally removes the boop blocked on it.
     */
    @TraceMethod("BoopNonceManager.pruneNonce")
    private pruneNonce(account: Address, nonceTrack: NonceTrack, nonceValue?: NonceValue) {
        const track = this.#blockedBoopsMap.get(account, nonceTrack)
        if (track && nonceValue) track.delete(nonceValue)
        if (track?.size === 0) {
            this.#blockedBoopsMap.delete(account, nonceTrack)
            this.#nonces.delete(account, nonceTrack)
            this.#nonceMutexes.delete(account, nonceTrack)
        }
    }

    @TraceMethod("BoopNonceManager.waitUntilUnblocked")
    async waitUntilUnblocked(entryPoint: Address, boop: Boop): Promise<undefined | SubmitError> {
        const { account, nonceTrack, nonceValue } = boop
        const localNonce = await this.getLocalNonce(entryPoint, account, nonceTrack)

        // Not blocked anymore, proceed immediately.
        if (nonceValue === localNonce) return

        // Check if we can wait for the nonce.
        const trackSize = this.#blockedBoopsMap.get(boop.account, boop.nonceTrack)?.size ?? 0
        if (trackSize >= env.MAX_BLOCKED_PER_TRACK) {
            return this.makeSubmitError(SubmitterError.BufferExceeded)
        }
        if (this.#usedCapacity >= env.MAX_TOTAL_BLOCKED) {
            return this.makeSubmitError(SubmitterError.OverCapacity)
        }
        if (nonceValue >= localNonce + BigInt(env.MAX_BLOCKED_PER_TRACK)) {
            return this.makeSubmitError(SubmitterError.NonceTooFarAhead)
        }

        // If an old boop exists for the nonce, signal that it has been replaced.
        // NOTE: This is here for robustness & future-proofness, but this path should not be reachable,
        // as we reject boops that we're already processing upstream in `submitInternal`.
        const previouslyBlocked = this.#blockedBoopsMap.get(account, nonceTrack)?.get(nonceValue)
        if (previouslyBlocked) {
            logger.error("Replacing previously blocked nonce — most likely a bug", account, nonceTrack, nonceValue)
            previouslyBlocked.resolve(this.makeSubmitError(SubmitterError.BoopReplaced))
        }

        const boopHash = computeHash(boop)
        const { promise, resolve } = promiseWithResolvers<undefined | SubmitError>()
        const timeout = setTimeout(async () => {
            logger.trace("Timed out while waiting to process blocked boop, attempting recovery", boopHash)

            // Proactively try to fix an inconsistent state by fetching the true on-chain nonce.
            await this.resyncNonce(entryPoint, account, nonceTrack)

            // After attempting recovery, check if the boop is still blocked.
            // It might have been unblocked and had its promise resolved by `resyncNonce`.
            if (this.#blockedBoopsMap.get(account, nonceTrack)?.has(nonceValue)) {
                // If it's still here, the resync didn't help, so now we officially time it out.
                this.pruneNonce(account, nonceTrack, nonceValue)
                resolve(this.makeSubmitError(SubmitterError.SubmitTimeout))
            }
        }, env.MAX_BLOCKED_TIME)

        this.#blockedBoopsMap
            .getOrSet(account, nonceTrack, () => new Map())
            .set(nonceValue, {
                boopHash,
                resolve: (response: undefined | SubmitError) => {
                    clearTimeout(timeout)
                    this.pruneNonce(account, nonceTrack, nonceValue)
                    resolve(response)
                },
            })

        this.#usedCapacity++
        return await promise
    }

    @TraceMethod("BoopNonceManager.makeSubmitError")
    private makeSubmitError(status: SubmitterErrorStatus): SubmitError {
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
        return { status, error: description, stage: "submit" }
    }

    /**
     * Increments the local nonce for the account and nonceTrack, unblocking a blocked boop if necessary.
     */
    @TraceMethod("BoopNonceManager.incrementLocalNonce")
    public incrementLocalNonce(boop: Boop): void {
        const { account, nonceTrack, nonceValue } = boop
        this.#usedCapacity--
        const nextNonce = nonceValue + 1n
        this.setLocalNonce(account, nonceTrack, nextNonce)
    }

    @TraceMethod("BoopNonceManager.setLocalNonce")
    private setLocalNonce(account: Address, nonceTrack: NonceTrack, nonceValue: NonceValue): void {
        const oldNonce = this.#nonces.get(account, nonceTrack)
        this.#nonces.set(account, nonceTrack, nonceValue)

        // Unblock next boop
        const blockedBoop = this.#blockedBoopsMap.get(account, nonceTrack)?.get(nonceValue)
        if (blockedBoop) blockedBoop.resolve(undefined)

        if (!oldNonce || nonceValue <= oldNonce) return
        // Otherwise we're skipping ahead, cancel pending nonces.

        const blockedMap = this.#blockedBoopsMap.get(account, nonceTrack)
        if (!blockedMap) return
        // biome-ignore format: keep on one line
        const blocked = blockedMap.entries().toArray().sort(([nonceA], [nonceB]) => Number(nonceA - nonceB)) ?? []
        for (const [blockedNonce, blockedBoop] of blocked) {
            // Only consider blocked nonces smaller than the new nonce — the `]oldNonce, nonceValue[` range.
            if (blockedNonce <= oldNonce) continue
            if (blockedNonce >= nonceValue) break
            blockedBoop.resolve(this.makeSubmitError(SubmitterError.ExternalSubmit))
            this.pruneNonce(account, nonceTrack, nonceValue)
        }
    }

    @TraceMethod("BoopNonceManager.getLocalNonce")
    private async getLocalNonce(entryPoint: Address, account: Address, nonceTrack: NonceTrack): Promise<NonceValue> {
        // If we already have a nonce, return it.
        const localNonce = this.#nonces.get(account, nonceTrack)
        if (localNonce) return localNonce

        // Otherwise, lookup the onchain nonce behind a mutex (to avoid
        // a close batch of boops to each trigger their own lookup).
        const mutex = this.#nonceMutexes.getOrSet(account, nonceTrack, () => new Mutex())
        return await mutex.locked(async () => {
            // NOTE: This behaves like we want: it won't await if the nonce is already set, and after the onchain is
            // awaited, it will only be set if the entry wasn't populated in the meantime.
            // This is the only case where it's safe to set the nonce without calling `getLocalNonce`.
            return await this.#nonces.getOrSetAsync(
                account,
                nonceTrack,
                async () => await this.getOnchainNonce(entryPoint, account, nonceTrack),
            )
        })
    }

    @TraceMethod("BoopNonceManager.getOnchainNonce")
    private async getOnchainNonce(entryPoint: Address, account: Address, nonceTrack: NonceTrack): Promise<NonceValue> {
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
    @TraceMethod("BoopNonceManager.resyncNonce")
    async resyncNonce(entryPoint: Address, account: Address, nonceTrack: NonceTrack): Promise<void> {
        if (!this.#nonces.get(account, nonceTrack)) return
        const onchainNonce = await this.getOnchainNonce(entryPoint, account, nonceTrack)
        // Recheck after await.
        const localNonce = this.#nonces.get(account, nonceTrack)
        if (!localNonce) return
        if (onchainNonce > localNonce) {
            logger.trace("Onchain nonce is ahead of local nonce — resyncing.", account, nonceTrack)
            this.setLocalNonce(account, nonceTrack, onchainNonce)
        }
    }
}
