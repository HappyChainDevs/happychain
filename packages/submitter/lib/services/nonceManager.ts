import { Map2, Mutex } from "@happy.tech/common"
import { type Result, err, ok } from "neverthrow"
import type { Address } from "viem/accounts"
import { publicClient } from "#lib/clients"
import { abis, deployment } from "#lib/deployments"
import env from "#lib/env"
import { SubmitterError } from "#lib/errors/submitter-errors"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import type { PendingHappyTxInfo } from "#lib/tmp/interface/submitter_pending"
import { computeHappyTxHash } from "#lib/utils/computeHappyTxHash"

type NonceTrack = bigint
type NonceValue = bigint

const MAX_WAIT_TIMEOUT_MS = 30_000

let totalCapacity = 0n
const nonces = new Map2<Address, NonceTrack, NonceValue>()
const nonceMutexes = new Map2<Address, NonceTrack, Mutex>()

const pendingTxMap = new Map2<
    Address,
    NonceTrack,
    Map<NonceValue, { hash: `0x${string}`; resolve: (value: Result<undefined, SubmitterError>) => void }>
>()

export function getPendingTransactions(account: Address) {
    const tx = pendingTxMap.getAll(account)
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

async function getOnchainNonce(account: Address, nonceTrack: NonceTrack) {
    return await publicClient.readContract({
        address: deployment.HappyEntryPoint,
        abi: abis.HappyEntryPoint,
        functionName: "nonceValues",
        args: [account, nonceTrack],
    })
}

async function getLocalNonce(account: `0x${string}`, nonceTrack: bigint) {
    const mutex = nonceMutexes.getOrSet(account, nonceTrack, () => new Mutex())
    return await mutex.locked(async () => {
        return await nonces.getOrSetAsync(account, nonceTrack, () => getOnchainNonce(account, nonceTrack))
    })
}

export async function checkFutureNonce(_tx: HappyTx) {
    const account = _tx.account
    const nonceTrack = _tx.nonceTrack
    const localNonce = await getLocalNonce(account, nonceTrack)
    return _tx.nonceValue > localNonce
}

export async function waitUntilUnblocked(tx: HappyTx): Promise<Result<undefined, SubmitterError>> {
    const track = pendingTxMap.getOrSet(tx.account, tx.nonceTrack, new Map())
    if (track.size >= env.LIMITS_EXECUTE_BUFFER_LIMIT) return err(new SubmitterError("bufferExceeded"))
    if (totalCapacity >= env.LIMITS_EXECUTE_MAX_CAPACITY) return err(new SubmitterError("maxCapacity")) // TODO: prune active account
    const localNonce = await getLocalNonce(tx.account, tx.nonceTrack)
    const maxNonce = localNonce + BigInt(env.LIMITS_EXECUTE_BUFFER_LIMIT)
    if (tx.nonceValue > maxNonce) return err(new SubmitterError("nonce out of range"))

    // wait until the tx is unblocked. when unblocked, we call 'resolve'
    return new Promise((resolve) => {
        // reject previous tx so it can be replaced
        const value = track.get(tx.nonceValue)
        if (value) value.resolve(err(new SubmitterError("transaction replaced")))

        // Timeout tx after 30 seconds if it hasn't been executed
        const timeout = setTimeout(() => resolve(err(new SubmitterError("transaction timeout"))), MAX_WAIT_TIMEOUT_MS)

        track.set(tx.nonceValue, {
            hash: computeHappyTxHash(tx),
            resolve: (response: Result<undefined, SubmitterError>) => {
                clearTimeout(timeout)
                resolve(response)
            },
        })
        pendingTxMap.set(tx.account, tx.nonceTrack, track)
        totalCapacity++
    })
}

export function incrementLocalNonce(tx: HappyTx) {
    // TX is completed, remove from running total
    totalCapacity--

    const account = tx.account
    const nonceTrack = tx.nonceTrack
    const nextNonce = tx.nonceValue + 1n

    nonces.set(account, nonceTrack, nextNonce)

    const track = pendingTxMap.get(account, nonceTrack)
    const pendingTx = track?.get(nextNonce)

    if (!track || !pendingTx) return

    pendingTx.resolve(ok(undefined))
    track.delete(nextNonce)
    if (!track.size) pendingTxMap.delete(account, nonceTrack)
}
