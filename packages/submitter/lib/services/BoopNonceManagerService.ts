import { Map2, Mutex, promiseWithResolvers } from "@happy.tech/common"
import { type Result, err, ok } from "neverthrow"
import type { Address } from "viem/accounts"
import { publicClient } from "#lib/clients"
import { abis, env } from "#lib/env"
import { SubmitterError } from "#lib/errors"
import type { PartialBoop } from "#lib/interfaces/Boop"
import type { PendingBoopInfo } from "#lib/interfaces/boop_pending"
import { computeBoopHash } from "#lib/utils/computeBoopHash"

type NonceTrack = bigint
type NonceValue = bigint
type BlockedBoop = { hash: `0x${string}`; resolve: (value: Result<undefined, SubmitterError>) => void }

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

    public async checkIfBlocked(entryPoint: Address, tx: PartialBoop): Promise<boolean> {
        const localNonce = await this.getLocalNonce(entryPoint, tx.account, tx.nonceTrack)
        return tx.nonceValue > localNonce
    }

    public async pauseUntilUnblocked(entrypoint: Address, tx: PartialBoop): Promise<Result<undefined, SubmitterError>> {
        if (this.trackExceedsBuffer(tx)) return err(new SubmitterError("bufferExceeded"))
        if (this.reachedMaxCapacity()) return err(new SubmitterError("maxCapacity"))
        if (await this.nonceOutOfRange(entrypoint, tx)) return err(new SubmitterError("nonce out of range"))

        const { account, nonceTrack, nonceValue } = tx

        const previouslyBlocked = this.blockedTxMap.get(account, nonceTrack)?.get(nonceValue)
        if (previouslyBlocked) previouslyBlocked.resolve(err(new SubmitterError("transaction replaced")))

        const { promise, resolve } = promiseWithResolvers<Result<undefined, SubmitterError>>()

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
            resolve(err(new SubmitterError("transaction timeout")))
        }, MAX_WAIT_TIMEOUT_MS)

        this.blockedTxMap
            .getOrSet(tx.account, tx.nonceTrack, () => new Map())
            .set(tx.nonceValue, {
                hash: computeBoopHash(BigInt(env.CHAIN_ID), tx),
                resolve: (response: Result<undefined, SubmitterError>) => {
                    clearTimeout(timeout)
                    resolve(response)
                },
            })

        this.totalCapacity++

        return promise
    }

    /**
     * Increments the local nonce determined by the given transaction
     * @param tx The transaction to be tracked
     */
    public incrementLocalNonce(tx: PartialBoop): void {
        this.totalCapacity--

        const { account, nonceTrack } = tx
        const nextNonce = tx.nonceValue + 1n

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
    public resetLocalNonce(boop: PartialBoop): void {
        const { account, nonceTrack } = boop
        this.nonces.delete(account, nonceTrack)
    }

    private getMaxNonce(currentNonce: bigint) {
        return currentNonce + BigInt(env.LIMITS_EXECUTE_BUFFER_LIMIT)
    }

    private reachedMaxCapacity() {
        return this.totalCapacity >= env.LIMITS_EXECUTE_MAX_CAPACITY
    }

    private trackExceedsBuffer(tx: PartialBoop) {
        const track = this.blockedTxMap.get(tx.account, tx.nonceTrack)
        if (!track) return false
        return track.size >= env.LIMITS_EXECUTE_BUFFER_LIMIT
    }

    private async nonceOutOfRange(entrypoint: `0x${string}`, tx: PartialBoop) {
        const possiblyCachedNonce = await this.getLocalNonce(entrypoint, tx.account, tx.nonceTrack)
        if (tx.nonceValue <= this.getMaxNonce(possiblyCachedNonce)) return false

        // reset to force onchain lookup
        this.resetLocalNonce(tx)
        // lookup one more time
        const onchainNonce = await this.getLocalNonce(entrypoint, tx.account, tx.nonceTrack)
        // if its still out of range, abort
        return tx.nonceValue > this.getMaxNonce(onchainNonce)
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
