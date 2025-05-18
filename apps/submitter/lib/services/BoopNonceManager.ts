import { type Hash, Map2, Mutex, promiseWithResolvers } from "@happy.tech/common"
import type { Address } from "viem/accounts"
import { abis, env } from "#lib/env"
import type { PendingBoopInfo } from "#lib/handlers/getPending"
import type { SubmitError } from "#lib/handlers/submit"
import { type Boop, SubmitterError } from "#lib/types"
import { publicClient } from "#lib/utils/clients"
import { logger } from "#lib/utils/logger"
import { computeHash } from "../utils/boop/computeHash"

type NonceTrack = bigint
type NonceValue = bigint
type BlockedBoop = { boopHash: Hash; resolve: (value: undefined | SubmitError) => void }

export class BoopNonceManager {
    #usedCapacity: bigint
    readonly #nonceMutexes: Map2<Address, NonceTrack, Mutex>
    readonly #nonces: Map2<Address, NonceTrack, NonceValue>
    readonly #pendingBoopsMap: Map2<Address, NonceTrack, Map<NonceValue, BlockedBoop>>

    constructor() {
        this.#usedCapacity = 0n
        this.#nonceMutexes = new Map2()
        this.#nonces = new Map2()
        this.#pendingBoopsMap = new Map2()
    }

    // TODO add nonce-warning method during simulate

    /**
     * Resets the local nonce so that the next call to getLocalNonce will fetch the onchain nonce.
     */
    resetLocalNonce(boop: Boop): void {
        const { account, nonceTrack } = boop
        this.#nonces.delete(account, nonceTrack)
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

    async waitUntilUnblocked(entryPoint: Address, boop: Boop): Promise<undefined | SubmitError> {
        const { account, nonceTrack, nonceValue } = boop
        const localNonce = await this.#getLocalNonce(entryPoint, account, nonceTrack)

        // Not actually blocked, proceed immediately.
        if (nonceValue === localNonce) return

        // Check if we can wait for the nonce.
        const trackSize = this.#pendingBoopsMap.get(boop.account, boop.nonceTrack)?.size ?? 0
        if (trackSize >= env.MAX_PENDING_PER_TRACK)
            return this.#makeSubmitError("Buffer full for this (account, nonceTrack) pair. Try again later.")
        if (this.#usedCapacity >= env.MAX_TOTAL_PENDING)
            return this.#makeSubmitError("The submitter has reached its maximum capacity. Try again later.")
        if (nonceValue >= localNonce + BigInt(env.MAX_PENDING_PER_TRACK))
            return this.#makeSubmitError("The supplied nonce is too far ahead of the current non value.")

        // If an old boop exists for th enonce, signal that it has been replaced.
        const previouslyBlocked = this.#pendingBoopsMap.get(account, nonceTrack)?.get(nonceValue)
        if (previouslyBlocked) previouslyBlocked.resolve(this.#makeSubmitError("transaction replaced"))

        const boopHash = computeHash(boop)
        const { promise, resolve } = promiseWithResolvers<undefined | SubmitError>()
        const timeout = setTimeout(() => {
            logger.trace("Timed out while waiting to process pending boop", boopHash)
            this.#removeNonce(account, nonceTrack, nonceValue)
            resolve(this.#makeSubmitError("transaction timeout"))
        }, env.MAX_SUBMIT_PENDING_TIME)

        this.#pendingBoopsMap
            .getOrSet(account, nonceTrack, () => new Map())
            .set(nonceValue, {
                boopHash,
                resolve: (response: undefined | SubmitError) => {
                    clearTimeout(timeout)
                    resolve(response)
                },
            })

        this.#usedCapacity++
        return await promise
    }

    #removeNonce(account: Address, nonceTrack: bigint, nonceValue: bigint) {
        const track = this.#pendingBoopsMap.get(account, nonceTrack)
        track?.delete(nonceValue)
        if (track?.size === 0) {
            this.#pendingBoopsMap.delete(account, nonceTrack)
            this.#nonces.delete(account, nonceTrack)
            this.#nonceMutexes.delete(account, nonceTrack)
        }
    }

    // TODO inline this with the proper errors
    #makeSubmitError(message: string): SubmitError {
        return {
            status: SubmitterError.UnexpectedError,
            description: message,
            stage: "submit",
        }
    }

    /**
     * Increments the local nonce for the account and nonceTrack, unblocking a pending boop if necessary.
     */
    public incrementLocalNonce(boop: Boop): void {
        const { account, nonceTrack, nonceValue } = boop
        this.#usedCapacity--
        const nextNonce = nonceValue + 1n
        this.#nonces.set(account, nonceTrack, nextNonce)
        const pendingBoop = this.#pendingBoopsMap.get(account, nonceTrack)?.get(nextNonce)
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
}
