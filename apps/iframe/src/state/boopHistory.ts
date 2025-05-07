import { type Boop, type BoopReceipt, Onchain } from "@happy.tech/boop-sdk"
import { createBigIntStorage } from "@happy.tech/common"
import type { Address, Hash, UInt256 } from "@happy.tech/common"
import { atom } from "jotai"
import { getDefaultStore } from "jotai"
import { atomWithStorage } from "jotai/utils"
import { StorageKey } from "#src/services/storage"
import { logger } from "#src/utils/logger.ts"
import { userAtom } from "./user"

// === Atom ============================================================================================================

const store = getDefaultStore()

/** Boop history for all accounts used on the device, saved to local storage. */
const historyRecordAtom = atomWithStorage<Record<Address, HistoryEntry[]>>(
    StorageKey.Boops,
    {},
    createBigIntStorage(),
    {
        getOnInit: true,
    },
)

/** Boop history for the current user. */
export const historyAtom = atom(
    (get) => {
        const user = get(userAtom)
        if (!user) return []
        return get(historyRecordAtom)[user.address] ?? []
    },
    (get, set, history: HistoryEntry[]) => {
        const user = get(userAtom)
        if (!user) return
        set(historyRecordAtom, (stored) => ({ ...stored, [user.address]: history.toSorted(compareEntries) }))
    },
)

// === Types ===========================================================================================================

export type HistoryEntry = {
    boopHash: Hash
    value: bigint
    nonceTrack: UInt256
    nonceValue: UInt256
    // This can be manipulated to handle out-of-order boop arrival. See `addPendingBoop`.
    createdAt: number
    // undefined means pending
    status?: typeof Onchain.Success | (string & {})
    receipt?: BoopReceipt
    error?: string
}

// === State Mutators ==================================================================================================

export function addPendingBoop(boopHash: Hash, boop: Boop): void {
    /**
     * Get the creation timestamp, which is either now or the lowest timestamp
     * for boops with a higher nonce on the same account and nonceTrack.
     */
    function getCreatedAt() {
        const now = Date.now()
        const higherNonces = history.filter((b) => b.nonceTrack === boop.nonceTrack && b.nonceValue > boop.nonceValue)
        return Math.min(now, ...higherNonces.map((b) => b.createdAt))
    }

    const history = store.get(historyAtom)
    const existing = history.find((b) => b.boopHash === boopHash)

    if (existing) {
        // We're already tracking the boop, only update its timestamp if appropriate.
        existing.createdAt = getCreatedAt()
        store.set(historyAtom, history)
        return
    }

    const entry = {
        // status: BoopStatus.Pending, // TODO
        boopHash,
        value: boop.value,
        nonceTrack: boop.nonceTrack,
        nonceValue: boop.nonceValue,
        createdAt: getCreatedAt(),
    } satisfies HistoryEntry

    history.push(entry)
    store.set(historyAtom, history) // Okay to not mutate, assignment will create new sorted array.
}

export function markBoopAsSuccess(boopHash: Hash, receipt: BoopReceipt): void {
    const history = store.get(historyAtom)
    const index = history.findIndex((entry) => entry.boopHash === boopHash)
    if (index < 0) {
        logger.error("Updating non-existing entry", receipt)
        return
    }
    history.splice(index, 1, { ...history[index], status: Onchain.Success, receipt })
    store.set(historyAtom, history) // Okay to not mutate, assignment will create new sorted array.
}

export function markBoopAsFailed(boopHash: Hash, status: string, error: string): void {
    const history = store.get(historyAtom)
    const index = history.findIndex((entry) => entry.boopHash === boopHash)
    if (index < 0) {
        logger.error("Updating non-existing entry", boopHash)
        return
    }
    history.splice(index, 1, { ...history[index], status, error })
    store.set(historyAtom, history) // Okay to not mutate, assignment will create new sorted array.
}

// === Sorting Logic ===================================================================================================

/**
 * Comparator to sort boops for the history view. First in the list = at the top.
 * 1. Pending boops go first.
 * 2. Otherwise sort by {@link HistoryEntry.createdAt} timestamp.
 *    We maintain an invariant that boops on the same track have monotically increasing timestamps wrt nonces values.
 * 3. Sort by nonceTrack (lower = first) and nonceValue (higher = first).
 */
function compareEntries(a: HistoryEntry, b: HistoryEntry): number {
    // 1. Pending boops come first
    if (!a.status || !b.status) {
        if (!a.status && b.status) return -1 // a is pending, b is not → a first
        if (a.status && !b.status) return 1 /// b is pending, b is not → b first
        // both pending the regular comparison logic applies between them
    }

    // 2. Sort by timestamp
    const cmp1 = b.createdAt - a.createdAt // higher timestamp = earlier
    if (cmp1 !== 0) return cmp1

    // 3. Sort by nonceTrack
    const cmp2 = Number(a.nonceTrack - b.nonceTrack) // lower nonceTrack = earlier
    if (cmp2 !== 0) return cmp2

    // 4. Sort by nonceValue
    return Number(b.nonceValue - a.nonceValue) // higher nonceValue = earlier
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

    // === pending boops ===
    if (isPendingA || isPendingB) {
        if (!isPendingA) return 1
        if (!isPendingB) return -1

        let comp = b.createdAt - a.createdAt
        if (comp !== 0) return comp

        const trackA = 0n
        const trackB = 0n
        comp = trackA > trackB ? 1 : trackA < trackB ? -1 : 0
        if (comp !== 0) return comp

        return 0
    }

    // === confirmed boops ===
    if (isSuccessA && isSuccessB) {
        const receiptA = (a.boopReceipt as ExecuteSuccess).receipt
        const receiptB = (b.boopReceipt as ExecuteSuccess).receipt

        let comp = Number(receiptB.blockNumber - receiptA.blockNumber)
        if (comp !== 0) return comp

        comp = receiptB.transactionIndex - receiptA.transactionIndex
        if (comp !== 0) return comp

        comp = receiptA.nonceTrack > receiptB.nonceTrack ? 1 : receiptA.nonceTrack < receiptB.nonceTrack ? -1 : 0
        if (comp !== 0) return comp

        return receiptB.nonceValue > receiptA.nonceValue ? 1 : receiptB.nonceValue < receiptA.nonceValue ? -1 : 0
    }

    // === failed boops ===
    if (isSuccessA) return -1
    if (isSuccessB) return 1

    // fallback: failed vs failed — sort by createdAt
    return b.failedAt - a.failedAt
}
