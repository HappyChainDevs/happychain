import { Map2, Mutex } from "@happy.tech/common"
import type { Address } from "viem/accounts"
import { publicClient } from "#src/clients"
import { abis } from "#src/deployments"
import env from "#src/env"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import type { PendingHappyTxInfo } from "#src/tmp/interface/submitter_pending"
import { computeHappyTxHash } from "#src/utils/getHappyTxHash"

type NonceTrack = bigint
type NonceValue = bigint

const MAX_WAIT_TIMEOUT_MS = 30_000

let totalCapacity = 0n
const nonces = new Map2<Address, NonceTrack, NonceValue>()
const nonceMutexes = new Map2<Address, NonceTrack, Mutex>()

const pendingTxMap = new Map2<
    Address,
    NonceTrack,
    Map<NonceValue, { hash: `0x${string}`; resolve: (value: unknown) => void; reject: () => void }>
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
        address: account,
        abi: abis.ScrappyAccount,
        functionName: "nonceValue",
        args: [nonceTrack],
    })
}

export async function isTxBlocked(_tx: HappyTx) {
    const account = _tx.account
    const nonceTrack = _tx.nonceTrack

    // TODO: is this race condition if 2 txs are submitted at the same time?
    // does one mutex get overwritten with the other?
    const mutex = nonceMutexes.getOrSet(account, nonceTrack, () => new Mutex())

    return await mutex.locked(async () => {
        const nonce = await nonces.getOrSetAsync(account, nonceTrack, () => getOnchainNonce(account, nonceTrack))
        return _tx.nonceValue > nonce
    })
}

export async function waitUntilUnblocked(tx: HappyTx) {
    // wait until the tx is unblocked. when unblocked, we call 'resolve'
    return new Promise((resolve, reject) => {
        const track = pendingTxMap.getOrSet(tx.account, tx.nonceTrack, new Map())
        if (track.size >= env.LIMITS_EXECUTE_BUFFER_LIMIT) throw new Error("bufferExceeded")
        if (totalCapacity >= env.LIMITS_EXECUTE_MAX_CAPACITY) throw new Error("bufferExceeded")

        // reject previous tx so it can be replaced
        const value = track.get(tx.nonceValue)
        if (value) value.reject()

        // Timeout tx after 30 seconds if it hasn't been executed
        const timeout = setTimeout(() => reject(new Error("transaction timeout")), MAX_WAIT_TIMEOUT_MS)

        track.set(tx.nonceValue, {
            hash: computeHappyTxHash(tx),
            resolve: () => {
                clearTimeout(timeout)
                resolve(undefined)
            },
            reject: () => {
                clearTimeout(timeout)
                reject(new Error("transaction rejected"))
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

    pendingTx.resolve(undefined)
    track.delete(nextNonce)
    if (!track.size) pendingTxMap.delete(account, nonceTrack)
}
