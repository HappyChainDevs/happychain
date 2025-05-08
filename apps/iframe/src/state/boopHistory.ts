import { type BoopReceipt, Onchain } from "@happy.tech/boop-sdk"
import { binaryPartition, createBigIntStorage } from "@happy.tech/common"
import type { Address, Hash } from "@happy.tech/common"
import { atom } from "jotai"
import { getDefaultStore } from "jotai"
import { atomWithStorage } from "jotai/utils"
import { StorageKey } from "../services/storage"
import { userAtom } from "./user"

// Store Instantiation
const store = getDefaultStore()

/**
 * List of all boops that are pending, successful, or failed.
 */
const boopsRecordAtom = atomWithStorage<Record<Address, StoredBoop[]>>(StorageKey.Boops, {}, createBigIntStorage(), {
    getOnInit: true,
})

/**
 * Atom that returns the boops for the current user
 */
export const boopsAtom = atom(
    (get) => {
        const user = get(userAtom)
        if (!user) return []
        return get(boopsRecordAtom)[user.address] ?? []
    },
    (get, set, boops: StoredBoop[]) => {
        const user = get(userAtom)
        if (!user) return

        set(boopsRecordAtom, (stored) => {
            return {
                // Must spread here for Jotai to trigger rerender
                ...stored,
                [user.address]: boops.toSorted(sortBoops),
            }
        })
    },
)

// === Interfaces ==============================================================================

export enum BoopStatus {
    Pending = "pending",
    Success = "success",
    Failure = "failure",
}

interface IStoredBoop {
    boopHash: Hash
    confirmedAt?: number
    createdAt: number
    value: bigint
    error?: { message: string; code?: number | string }
    failedAt?: number
    boopReceipt?: BoopReceipt
    status: BoopStatus
}
export type StoredBoop = PendingBoop | ConfirmedBoop | FailedBoop
export interface PendingBoop extends IStoredBoop {
    error?: never
    boopReceipt?: never
    status: BoopStatus.Pending
    nonceTrack?: UInt256
    nonceValue?: UInt256
}

export interface ConfirmedBoop extends IStoredBoop {
    confirmedAt: number
    error?: never
    failedAt?: never
    boopReceipt: BoopReceipt
    status: BoopStatus.Success
}

export interface FailedBoop extends IStoredBoop {
    confirmedAt?: never
    error?: { message: string; code?: number | string }
    failedAt: number
    boopReceipt?: never
    status: BoopStatus.Failure
}

export type BoopEntry = PendingBoop | ConfirmedBoop | FailedBoop

// === State Mutators ==============================================================================

export function addPendingBoop(
    boop: Omit<PendingBoop, "createdAt" | "status"> & {
        nonceTrack?: UInt256
        nonceValue?: UInt256
    },
): void {
    const entry = {
        boopHash: boop.boopHash,
        value: boop.value,
        createdAt: Date.now(),
        status: BoopStatus.Pending,
    } satisfies PendingBoop

    const accountBoops = store.get(boopsAtom) || []
    const existing = accountBoops.find((boop) => boop.boopHash === entry.boopHash)
    if (existing) existing.createdAt = Date.now()
    else accountBoops.push(entry)

    store.set(boopsAtom, accountBoops.toSorted(sortBoops))
}

export function markBoopAsSuccess(receipt: BoopReceipt): void {
    if (receipt.status !== Onchain.Success) {
        console.error("Cannot mark boop as confirmed: Boop hash is missing.")
        return
    }

    updateBoopStatus(receipt.boopHash, {
        status: BoopStatus.Success,
        confirmedAt: Date.now(),
        boopReceipt: receipt,
    } satisfies Omit<ConfirmedBoop, "boopHash" | "createdAt" | "value">)
}

export function markBoopAsFailure(
    boopHash: Hash,
    error?: {
        message: string
        code?: number | string
    },
): void {
    updateBoopStatus(boopHash, {
        status: BoopStatus.Failure,
        failedAt: Date.now(),
        error,
    } satisfies Omit<FailedBoop, "boopHash" | "createdAt" | "value">)
}

function updateBoopStatus(boopHash: Hash, update: Partial<StoredBoop>): void {
    const [[existing], rest] = binaryPartition(
        store.get(boopsAtom) ?? [], //
        (boop) => boop.boopHash === boopHash,
    )
    if (!existing) {
        console.warn("Boop not found in history, cannot update status", { boopHash, update })
        return
    }
    const updated = { ...existing, ...update } as StoredBoop
    store.set(boopsAtom, [...rest, updated])
}

/**
 * Comparator function to deterministically sort a list of Boops (`StoredBoop[]`), supporting all lifecycle states:
 * Pending, Confirmed (Success), and Failed.
 *
 * The sort logic follows this multi-stage ordering strategy:
 *
 * 1. **Pending Boops come first**:
 *    - Sorted by `createdAt` (descending), so newest are shown first.
 *    - Tie-breakers like `nonceTrack` and `nonceValue` are ignored since they are not available for pending boops.
 *
 * 2. **Confirmed (Success) Boops come next**:
 *    - Sorted by `blockNumber` (descending) to show the most recent block confirmations first.
 *    - Tie-breaker: `transactionIndex` (descending) to order within a block.
 *    - Tie-breaker: `nonceTrack` (ascending) to provide deterministic ordering across parallel nonce lanes.
 *    - Final tie-breaker: `nonceValue` (descending) to show highest nonce first within the same track.
 *
 * 3. **Failed Boops come last**:
 *    - Positioned below both Pending and Confirmed boops.
 *    - Sorted by `failedAt` (descending) to reflect most recent failures first.
 *
 * This ordering ensures:
 * - Pending Boops surface to the top for active user feedback.
 * - Confirmed Boops follow, sequenced clearly by their onchain status.
 * - Failed Boops are demoted but still visible in a useful reverse-chronological view.
 *
 * Intended for use with `Array.prototype.toSorted(sortBoops)` to preserve immutability and state integrity.
 */
function sortBoops(a: StoredBoop, b: StoredBoop): number {
    const isPendingA = a.status === BoopStatus.Pending
    const isPendingB = b.status === BoopStatus.Pending
    const isSuccessA = a.status === BoopStatus.Success
    const isSuccessB = b.status === BoopStatus.Success

    // === 1. Pending boops ===
    if (isPendingA || isPendingB) {
        if (!isPendingA) return 1 // b is pending, a is not → b first
        if (!isPendingB) return -1 // a is pending, b is not → a first

        // Most recent arrival first
        let comp = b.createdAt - a.createdAt
        if (comp !== 0) return comp

        // Smallest nonceTrack first (rare tie-breaker)
        const trackA = a.nonceTrack ?? 0n
        const trackB = b.nonceTrack ?? 0n
        comp = trackA > trackB ? 1 : trackA < trackB ? -1 : 0
        if (comp !== 0) return comp

        // Highest nonceValue first
        const nonceA = a.nonceValue ?? 0n
        const nonceB = b.nonceValue ?? 0n
        return nonceB > nonceA ? 1 : nonceB < nonceA ? -1 : 0
    }

    // === 2. Confirmed boops ===
    if (isSuccessA && isSuccessB) {
        const receiptA = (a.boopReceipt as ExecuteSuccess).receipt
        const receiptB = (b.boopReceipt as ExecuteSuccess).receipt

        let comp = Number(receiptB.txReceipt.blockNumber - receiptA.txReceipt.blockNumber)
        if (comp !== 0) return comp

        comp = receiptB.txReceipt.transactionIndex - receiptA.txReceipt.transactionIndex
        if (comp !== 0) return comp

        comp = receiptA.nonceTrack > receiptB.nonceTrack ? 1 : receiptA.nonceTrack < receiptB.nonceTrack ? -1 : 0
        if (comp !== 0) return comp

        return receiptB.nonceValue > receiptA.nonceValue ? 1 : receiptB.nonceValue < receiptA.nonceValue ? -1 : 0
    }

    // === 3. Failed boops ===
    if (isSuccessA) return -1
    if (isSuccessB) return 1

    // fallback: failed vs failed — sort by failedAt (descending)
    return b.failedAt - a.failedAt
}
