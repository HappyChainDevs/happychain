import { type ExecuteOutput, type ExecuteSuccess, Onchain } from "@happy.tech/boop-sdk"
import { createBigIntStorage } from "@happy.tech/common"
import type { Address, Hash, UInt256 } from "@happy.tech/common"
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

export type ErrorType = { message: string; code?: number | string }

export enum BoopStatus {
    Pending = "pending",
    Success = "success",
    Failure = "failure",
}

interface IStoredBoop {
    boopHash: Hash
    confirmedAt?: number
    createdAt: number
    arrivalTimestamp: number // Virtual timestamp for sorting pending boops
    value: bigint
    error?: ErrorType
    failedAt?: number
    boopReceipt?: ExecuteOutput
    status: BoopStatus
    nonceTrack?: UInt256
    nonceValue?: UInt256
}
export type StoredBoop = PendingBoop | ConfirmedBoop | FailedBoop
export interface PendingBoop extends IStoredBoop {
    confirmedAt?: undefined
    error?: undefined
    boopReceipt?: undefined
    status: BoopStatus.Pending
    nonceTrack: UInt256 // Always present for pending boops
    nonceValue: UInt256 // Always present for pending boops
}

export interface ConfirmedBoop extends IStoredBoop {
    confirmedAt: number
    error?: undefined
    failedAt?: undefined
    boopReceipt: ExecuteOutput
    status: BoopStatus.Success
}

export interface FailedBoop extends IStoredBoop {
    confirmedAt?: undefined
    error?: ErrorType
    failedAt: number
    boopReceipt?: undefined
    status: BoopStatus.Failure
}

export type BoopEntry = PendingBoop | ConfirmedBoop | FailedBoop

// === State Mutators ==============================================================================

export function addPendingBoop(boop: Omit<PendingBoop, "createdAt" | "status" | "arrivalTimestamp">): void {
    const accountBoops = store.get(boopsAtom) || []
    const existing = accountBoops.find((b) => b.boopHash === boop.boopHash)

    if (existing) {
        existing.createdAt = Date.now()
        existing.arrivalTimestamp = Date.now()
        store.set(boopsAtom, accountBoops)
        return
    }

    const currentTimestamp = Date.now()

    // Find boops in the same nonce track with higher nonce values
    const sameTrackHigherNonce = accountBoops.filter(
        (b) =>
            b.nonceTrack === boop.nonceTrack &&
            b.nonceValue !== undefined &&
            boop.nonceValue !== undefined &&
            b.nonceValue > boop.nonceValue,
    )

    // Assign virtual timestamp: min(highestTimestampForBoopWithHigherNonce, currentTimestamp)
    const arrivalTimestamp =
        sameTrackHigherNonce.length > 0
            ? Math.min(currentTimestamp, ...sameTrackHigherNonce.map((b) => b.arrivalTimestamp))
            : currentTimestamp

    const entry = {
        boopHash: boop.boopHash,
        value: boop.value,
        nonceTrack: boop.nonceTrack,
        nonceValue: boop.nonceValue,
        createdAt: currentTimestamp,
        arrivalTimestamp,
        status: BoopStatus.Pending,
    } satisfies PendingBoop

    accountBoops.push(entry)
    store.set(boopsAtom, accountBoops)
}

export function markBoopAsSuccess(receipt: ExecuteSuccess): void {
    if (receipt.status !== Onchain.Success) {
        console.error("Cannot mark boop as confirmed: Boop hash is missing.")
        return
    }

    const boops = store.get(boopsAtom) ?? []
    const updatedBoops = boops.map((boop) =>
        boop.boopHash === receipt.receipt.boopHash
            ? ({
                  ...boop,
                  status: BoopStatus.Success,
                  confirmedAt: Date.now(),
                  boopReceipt: receipt,
              } as ConfirmedBoop)
            : boop,
    )

    store.set(boopsAtom, updatedBoops)
}

export function markBoopAsFailure(boopHash: Hash, error?: ErrorType): void {
    const boops = store.get(boopsAtom) ?? []
    const updatedBoops = boops.map((boop) =>
        boop.boopHash === boopHash
            ? ({
                  ...boop,
                  status: BoopStatus.Failure,
                  failedAt: Date.now(),
                  error,
              } as FailedBoop)
            : boop,
    )

    store.set(boopsAtom, updatedBoops)
}

// === Sorting Logic ==============================================================================

/**
 * Comparator function to deterministically sort a list of Boops (`StoredBoop[]`), supporting all lifecycle states:
 * Pending, Confirmed (Success), and Failed.
 *
 * The sort logic follows this multi-stage ordering strategy:
 *
 * 1. **Pending Boops come first**:
 *    - Sorted by `arrivalTimestamp` (most recent first) - this timestamp is adjusted during insertion
 *      to ensure nonces within the same track maintain proper ordering
 *    - Tie-breaker: `nonceTrack` (ascending) for deterministic ordering across parallel tracks
 *    - Final tie-breaker: `nonceValue` (descending) - highest nonce first within same track
 *
 * 2. **Confirmed (Success) Boops come next**:
 *    - Sorted by `blockNumber` (descending) to show the most recent block confirmations first
 *    - Tie-breaker: `transactionIndex` (descending) to order within a block
 *    - Tie-breaker: `nonceTrack` (ascending) for deterministic ordering
 *    - Final tie-breaker: `nonceValue` (descending) - highest nonce first within same track
 *
 * 3. **Failed Boops come last**:
 *    - Most failed boops won't have receipts (only those that failed onchain do)
 *    - Sorted by `createdAt` (most recent first) since no reliable block info
 *    - Same tie-breakers as pending boops for consistency
 *
 * This ordering ensures:
 * - Pending Boops surface to the top for active user feedback
 * - Within same nonce track, lower nonces appear before higher nonces (due to arrivalTimestamp adjustment)
 * - Confirmed/Failed Boops follow, sequenced clearly by their onchain/temporal status
 *
 * Key insight: The `arrivalTimestamp` field is computed during insertion using the formula:
 * `min(highestTimestampForBoopWithHigherNonce(boop.nonceTrack), currentTimestamp)`
 * This eliminates ordering paradoxes and allows simple comparison-based sorting.
 */
function sortBoops(a: StoredBoop, b: StoredBoop): number {
    // === Helper functions ===
    function getBlockNumber(boop: StoredBoop): bigint {
        return boop.status === BoopStatus.Success && boop.boopReceipt?.receipt?.blockNumber
            ? boop.boopReceipt.receipt.blockNumber
            : 0n
    }

    // === 1. Pending boops come first ===
    if (a.status === BoopStatus.Pending || b.status === BoopStatus.Pending) {
        if (a.status !== BoopStatus.Pending) return 1 // b is pending, a is not → b first
        if (b.status !== BoopStatus.Pending) return -1 // a is pending, b is not → a first

        // Both pending - sort by arrival timestamp (most recent first)
        let comp = b.arrivalTimestamp - a.arrivalTimestamp
        if (comp !== 0) return comp

        // Tie-breaker: nonceTrack (ascending)
        comp = Number((a.nonceTrack ?? 0n) - (b.nonceTrack ?? 0n))
        if (comp !== 0) return comp

        // Final tie-breaker: nonceValue (descending - highest nonce first)
        return Number((b.nonceValue ?? 0n) - (a.nonceValue ?? 0n))
    }

    // === 2. Between confirmed and failed, confirmed comes first ===
    if (a.status === BoopStatus.Success && b.status === BoopStatus.Failure) return -1
    if (b.status === BoopStatus.Success && a.status === BoopStatus.Failure) return 1

    // === 3. Both confirmed - sort by blockchain ordering ===
    if (a.status === BoopStatus.Success && b.status === BoopStatus.Success) {
        // Sort by block number (most recent first)
        let comp = Number(getBlockNumber(b) - getBlockNumber(a))
        if (comp !== 0) return comp

        // Same transaction index - sort by nonceTrack (ascending)
        comp = Number((a.nonceTrack ?? 0n) - (b.nonceTrack ?? 0n))
        if (comp !== 0) return comp

        // Final tie-breaker: nonceValue (descending)
        return Number((b.nonceValue ?? 0n) - (a.nonceValue ?? 0n))
    }

    // === 4. Both failed - sort by creation time ===
    if (a.status === BoopStatus.Failure && b.status === BoopStatus.Failure) {
        // Sort by creation time (most recent first)
        let comp = b.createdAt - a.createdAt
        if (comp !== 0) return comp

        // Same timestamp - sort by nonceTrack (ascending)
        comp = Number((a.nonceTrack ?? 0n) - (b.nonceTrack ?? 0n))
        if (comp !== 0) return comp

        // Final tie-breaker: nonceValue (descending)
        return Number((b.nonceValue ?? 0n) - (a.nonceValue ?? 0n))
    }

    return 0
}
