import { type Hash, Map2, Mutex, promiseWithResolvers } from "@happy.tech/common"
import { type Result, err, ok } from "neverthrow"
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

const MAX_WAIT_TIMEOUT_MS = 30_000
const NONCE_BUFFER_LIMIT = BigInt(env.LIMITS_EXECUTE_BUFFER_LIMIT)

export class BoopNonceManagerService {
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

    async checkIfBlocked(entryPoint: Address, boop: Boop): Promise<Result<boolean, SubmitError>> {
        if (this.#trackExceedsBuffer(boop))
            return err(this.#makeSubmitError("Buffer full for this (account, nonceTrack) pair. Try again later."))
        if (this.#reachedMaxCapacity())
            return err(this.#makeSubmitError("The submitter has reached its maximum capacity. Try again later."))
        if (await this.#nonceOutOfRange(entryPoint, boop))
            return err(this.#makeSubmitError("The supplied nonce is too far ahead of the current non value."))

        const localNonce = await this.#getLocalNonce(entryPoint, boop.account, boop.nonceTrack)
        return ok(boop.nonceValue > localNonce)
    }

    #trackExceedsBuffer(boop: Boop) {
        const track = this.#pendingBoopsMap.get(boop.account, boop.nonceTrack)
        if (!track) return false
        return track.size >= env.LIMITS_EXECUTE_BUFFER_LIMIT
    }

    #reachedMaxCapacity() {
        return this.#usedCapacity >= env.LIMITS_EXECUTE_MAX_CAPACITY
    }

    async #nonceOutOfRange(entrypoint: `0x${string}`, boop: Boop) {
        const possiblyCachedNonce = await this.#getLocalNonce(entrypoint, boop.account, boop.nonceTrack)
        if (boop.nonceValue <= possiblyCachedNonce + NONCE_BUFFER_LIMIT) return false
        // reset to force onchain lookup, abort if still out of range
        logger.trace("Nonce out of range, forcing onchain re-lookup", computeHash(boop))
        this.resetLocalNonce(boop)
        const onchainNonce = await this.#getLocalNonce(entrypoint, boop.account, boop.nonceTrack)
        return boop.nonceValue > onchainNonce + NONCE_BUFFER_LIMIT
    }

    async pauseUntilUnblocked(_entrypoint: Address, boop: Boop): Promise<undefined | SubmitError> {
        const { account, nonceTrack, nonceValue } = boop
        const previouslyBlocked = this.#pendingBoopsMap.get(account, nonceTrack)?.get(nonceValue)
        if (previouslyBlocked) previouslyBlocked.resolve(this.#makeSubmitError("transaction replaced"))

        const { promise, resolve } = promiseWithResolvers<undefined | SubmitError>()

        const timeout = setTimeout(() => {
            const track = this.#pendingBoopsMap.get(account, nonceTrack)
            track?.delete(nonceValue)
            if (track?.size === 0) {
                this.#pendingBoopsMap.delete(account, nonceTrack)
                this.#nonces.delete(account, nonceTrack)
                this.#nonceMutexes.delete(account, nonceTrack)
            }
            resolve(this.#makeSubmitError("transaction timeout"))
        }, MAX_WAIT_TIMEOUT_MS)

        this.#pendingBoopsMap
            .getOrSet(boop.account, boop.nonceTrack, () => new Map())
            .set(boop.nonceValue, {
                boopHash: computeHash(boop),
                resolve: (response: undefined | SubmitError) => {
                    clearTimeout(timeout)
                    resolve(response)
                },
            })

        this.#usedCapacity++

        return promise
    }

    #makeSubmitError(message: string): SubmitError {
        return {
            status: SubmitterError.UnexpectedError,
            description: message,
            stage: "submit",
        }
    }

    /**
     * Increments the local nonce determined by the given transaction
     * @param boop The transaction to be tracked
     */
    public incrementLocalNonce(boop: Boop): void {
        this.#usedCapacity--

        const { account, nonceTrack } = boop
        const nextNonce = boop.nonceValue + 1n

        this.#nonces.set(account, nonceTrack, nextNonce)

        const track = this.#pendingBoopsMap.get(account, nonceTrack)
        const blockedBoop = track?.get(nextNonce)

        if (!track || !blockedBoop) return

        blockedBoop.resolve(undefined)

        track?.delete(nextNonce)
        if (track?.size === 0) {
            // prune the empty tracks
            this.#pendingBoopsMap.delete(account, nonceTrack)
            this.#nonces.delete(account, nonceTrack)
            this.#nonceMutexes.delete(account, nonceTrack)
        }
    }

    async #getLocalNonce(entryPoint: Address, account: Address, nonceTrack: NonceTrack): Promise<NonceValue> {
        const mutex = this.#nonceMutexes.getOrSet(account, nonceTrack, () => new Mutex())
        return await mutex.locked(async () => {
            return await this.#nonces.getOrSetAsync(account, nonceTrack, () =>
                this.#getOnchainNonce(entryPoint, account, nonceTrack),
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
