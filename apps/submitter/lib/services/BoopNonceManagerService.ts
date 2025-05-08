import { Map2, Mutex, promiseWithResolvers } from "@happy.tech/common"
import { type Result, err, ok } from "neverthrow"
import type { Address } from "viem/accounts"
import type { SubmitError } from "#lib/client.ts"
import { abis, env } from "#lib/env"
import type { PendingBoopInfo } from "#lib/handlers/getPending"
import { type Boop, SubmitterError } from "#lib/types"
import { publicClient } from "#lib/utils/clients"
import { computeBoopHash } from "./computeBoopHash"

type NonceTrack = bigint
type NonceValue = bigint
type BlockedBoop = { hash: `0x${string}`; resolve: (value: Result<undefined, SubmitError>) => void }

const MAX_WAIT_TIMEOUT_MS = 30_000

export class BoopNonceManagerService {
    private totalCapacity: bigint
    private readonly nonceMutexes: Map2<Address, NonceTrack, Mutex>
    private readonly nonces: Map2<Address, NonceTrack, NonceValue>
    private readonly blockedTxMap: Map2<Address, NonceTrack, Map<NonceValue, BlockedBoop>>

    constructor() {
        this.totalCapacity = 0n
        this.nonceMutexes = new Map2()
        this.nonces = new Map2()
        this.blockedTxMap = new Map2()
    }

    /**
     * Returns all blocked (queued) Boops for a given account. These
     */
    public getBlockedBoops(account: Address): PendingBoopInfo[] {
        const tx = this.blockedTxMap.getAll(account)
        if (!tx) return []
        return Array.from(tx.entries()).flatMap(([nonceTrack, txMap]) => {
            return Array.from(txMap.entries()).flatMap(([nonceValue, tx]) => {
                return {
                    nonceTrack,
                    nonceValue,
                    hash: tx.hash,
                    submitted: false,
                } satisfies PendingBoopInfo
            })
        })
    }

    public async checkIfBlocked(entryPoint: Address, boop: Boop): Promise<Result<boolean, SubmitError>> {
        if (this.trackExceedsBuffer(boop))
            return err(this.#makeSubmitError("Buffer full for this (account, nonceTrack) pair. Try again later."))
        if (this.reachedMaxCapacity())
            return err(this.#makeSubmitError("The submitter has reached its maximum capacity. Try again later."))
        if (await this.nonceOutOfRange(entryPoint, boop))
            return err(this.#makeSubmitError("The supplied nonce is too far ahead of the current non value."))

        const localNonce = await this.getLocalNonce(entryPoint, boop.account, boop.nonceTrack)
        return ok(boop.nonceValue > localNonce)
    }

    public pauseUntilUnblocked(_entrypoint: Address, boop: Boop): Promise<Result<undefined, SubmitError>> {
        const { account, nonceTrack, nonceValue } = boop

        const previouslyBlocked = this.blockedTxMap.get(account, nonceTrack)?.get(nonceValue)

        if (previouslyBlocked) previouslyBlocked.resolve(err(this.#makeSubmitError("transaction replaced")))

        const { promise, resolve } = promiseWithResolvers<Result<undefined, SubmitError>>()

        const timeout = setTimeout(() => {
            // remove the tx
            const track = this.blockedTxMap.get(account, nonceTrack)
            track?.delete(nonceValue)
            if (track?.size === 0) {
                // prune the empty tracks
                this.blockedTxMap.delete(account, nonceTrack)
                this.nonces.delete(account, nonceTrack)
                this.nonceMutexes.delete(account, nonceTrack)
            }
            resolve(err(this.#makeSubmitError("transaction timeout")))
        }, MAX_WAIT_TIMEOUT_MS)

        this.blockedTxMap
            .getOrSet(boop.account, boop.nonceTrack, () => new Map())
            .set(boop.nonceValue, {
                hash: computeBoopHash(BigInt(env.CHAIN_ID), boop),
                resolve: (response: Result<undefined, SubmitError>) => {
                    clearTimeout(timeout)
                    resolve(response)
                },
            })

        this.totalCapacity++

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
        this.totalCapacity--

        const { account, nonceTrack } = boop
        const nextNonce = boop.nonceValue + 1n

        this.nonces.set(account, nonceTrack, nextNonce)

        const track = this.blockedTxMap.get(account, nonceTrack)
        const blockedBoop = track?.get(nextNonce)

        if (!track || !blockedBoop) return

        blockedBoop.resolve(ok(undefined))

        track?.delete(nextNonce)
        if (track?.size === 0) {
            // prune the empty tracks
            this.blockedTxMap.delete(account, nonceTrack)
            this.nonces.delete(account, nonceTrack)
            this.nonceMutexes.delete(account, nonceTrack)
        }
    }

    /**
     * Resets the local nonce so that the next call to getLocalNonce will fetch the onchain nonce.
     */
    public resetLocalNonce(boop: Boop): void {
        const { account, nonceTrack } = boop
        this.nonces.delete(account, nonceTrack)
    }

    private getMaxNonce(currentNonce: bigint) {
        return currentNonce + BigInt(env.LIMITS_EXECUTE_BUFFER_LIMIT)
    }

    private reachedMaxCapacity() {
        return this.totalCapacity >= env.LIMITS_EXECUTE_MAX_CAPACITY
    }

    private trackExceedsBuffer(boop: Boop) {
        const track = this.blockedTxMap.get(boop.account, boop.nonceTrack)
        if (!track) return false
        return track.size >= env.LIMITS_EXECUTE_BUFFER_LIMIT
    }

    private async nonceOutOfRange(entrypoint: `0x${string}`, boop: Boop) {
        const possiblyCachedNonce = await this.getLocalNonce(entrypoint, boop.account, boop.nonceTrack)
        if (boop.nonceValue <= this.getMaxNonce(possiblyCachedNonce)) return false

        // reset to force onchain lookup
        this.resetLocalNonce(boop)
        // lookup one more time
        const onchainNonce = await this.getLocalNonce(entrypoint, boop.account, boop.nonceTrack)
        // if its still out of range, abort
        return boop.nonceValue > this.getMaxNonce(onchainNonce)
    }

    private async getOnchainNonce(entryPoint: Address, account: Address, nonceTrack: NonceTrack): Promise<NonceValue> {
        return await publicClient.readContract({
            address: entryPoint,
            abi: abis.EntryPoint,
            functionName: "nonceValues",
            args: [account, nonceTrack],
        })
    }

    private async getLocalNonce(entryPoint: Address, account: Address, nonceTrack: NonceTrack): Promise<NonceValue> {
        const mutex = this.nonceMutexes.getOrSet(account, nonceTrack, () => new Mutex())
        return await mutex.locked(async () => {
            return await this.nonces.getOrSetAsync(account, nonceTrack, () =>
                this.getOnchainNonce(entryPoint, account, nonceTrack),
            )
        })
    }
}
