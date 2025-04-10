import { Map2, Mutex } from "@happy.tech/common"
import { type Result, err, ok } from "neverthrow"
import type { Address } from "viem/accounts"
import { publicClient } from "#lib/clients"
import { abis } from "#lib/deployments"
import env from "#lib/env"
import { SubmitterError } from "#lib/errors/submitter-errors"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import type { PendingHappyTxInfo } from "#lib/tmp/interface/submitter_pending"
import { computeHappyTxHash } from "#lib/utils/computeHappyTxHash"

type NonceTrack = bigint
type NonceValue = bigint
type PendingBoop = { hash: `0x${string}`; resolve: (value: Result<undefined, SubmitterError>) => void }

const MAX_WAIT_TIMEOUT_MS = 30_000

export class BoopNonceManagerService {
    private totalCapacity: bigint
    private readonly nonces: Map2<Address, NonceTrack, NonceValue>
    private readonly nonceMutexes: Map2<Address, NonceTrack, Mutex>
    private readonly pendingTxMap: Map2<Address, NonceTrack, Map<NonceValue, PendingBoop>>

    constructor() {
        this.totalCapacity = 0n
        this.nonces = new Map2()
        this.nonceMutexes = new Map2()
        this.pendingTxMap = new Map2()
    }

    /**
     * Returns all pending (queued) Boops for a given account. These
     */
    public getPendingBoops(account: Address): PendingHappyTxInfo[] {
        const tx = this.pendingTxMap.getAll(account)
        if (!tx) return []
        return Array.from(tx.entries()).flatMap(([nonceTrack, txMap]) => {
            return Array.from(txMap.entries()).flatMap(([nonceValue, tx]) => {
                return {
                    nonceTrack,
                    nonceValue,
                    hash: tx.hash,
                    submitted: false,
                } satisfies PendingHappyTxInfo
            })
        })
    }

    public async checkIfBlocked(entryPoint: Address, tx: HappyTx): Promise<boolean> {
        const account = tx.account
        const nonceTrack = tx.nonceTrack
        const localNonce = await this.getLocalNonce(entryPoint, account, nonceTrack)
        return tx.nonceValue > localNonce
    }

    public async pauseUntilUnblocked(entrypoint: Address, tx: HappyTx): Promise<Result<undefined, SubmitterError>> {
        const track = this.pendingTxMap.getOrSet(tx.account, tx.nonceTrack, () => new Map())
        if (track.size >= env.LIMITS_EXECUTE_BUFFER_LIMIT) return err(new SubmitterError("bufferExceeded"))
        if (this.totalCapacity >= env.LIMITS_EXECUTE_MAX_CAPACITY) return err(new SubmitterError("maxCapacity"))
        const localNonce = await this.getLocalNonce(entrypoint, tx.account, tx.nonceTrack)
        const maxNonce = localNonce + BigInt(env.LIMITS_EXECUTE_BUFFER_LIMIT)
        if (tx.nonceValue > maxNonce) return err(new SubmitterError("nonce out of range"))

        return new Promise((resolve) => {
            const value = track.get(tx.nonceValue)
            if (value) value.resolve(err(new SubmitterError("transaction replaced")))

            const timeout = setTimeout(
                () => resolve(err(new SubmitterError("transaction timeout"))),
                MAX_WAIT_TIMEOUT_MS,
            )

            track.set(tx.nonceValue, {
                hash: computeHappyTxHash(tx),
                resolve: (response: Result<undefined, SubmitterError>) => {
                    clearTimeout(timeout)
                    resolve(response)
                },
            })
            this.pendingTxMap.set(tx.account, tx.nonceTrack, track)
            this.totalCapacity++
        })
    }

    public incrementLocalNonce(tx: HappyTx): void {
        this.totalCapacity--

        const account = tx.account
        const nonceTrack = tx.nonceTrack
        const nextNonce = tx.nonceValue + 1n

        this.nonces.set(account, nonceTrack, nextNonce)

        const track = this.pendingTxMap.get(account, nonceTrack)
        const pendingTx = track?.get(nextNonce)

        if (!track || !pendingTx) return

        pendingTx.resolve(ok(undefined))
        track.delete(nextNonce)
        if (!track.size) this.pendingTxMap.delete(account, nonceTrack)
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
