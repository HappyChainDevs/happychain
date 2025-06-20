import { type Boop, type BoopReceipt, Onchain } from "@happy.tech/boop-sdk"
import type { Address, Hash, UInt256 } from "@happy.tech/common"
import { createBigIntStorage } from "@happy.tech/common"
import { atom, getDefaultStore } from "jotai"
import { atomWithStorage } from "jotai/utils"
import { StorageKey } from "#src/services/storage"
import { reqLogger } from "#src/utils/logger"
import { userAtom } from "./user"

// === Atom ============================================================================================================

const store = getDefaultStore()

/** Boop history for all accounts used on the device, saved to local storage. */
const historyRecordAtom = atomWithStorage<Record<Address, HistoryEntry[]>>(
    StorageKey.Boops,
    {},
    createBigIntStorage(),
    { getOnInit: true },
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
        // Limit size of history to 50 entries.
        const updatedHistory = history.toSorted(compareEntries).slice(0, 50)
        set(historyRecordAtom, (stored) => ({ ...stored, [user.address]: updatedHistory }))
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
        const higherNonces = history.filter((e) => e.nonceTrack === boop.nonceTrack && e.nonceValue > boop.nonceValue)
        return Math.min(now, ...higherNonces.map((e) => e.createdAt))
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
        reqLogger.error("Updating non-existing entry", receipt)
        return
    }
    history.splice(index, 1, { ...history[index], status: Onchain.Success, receipt })
    store.set(historyAtom, history) // Okay to not mutate, assignment will create new sorted array.
}

export function markBoopAsFailed(boopHash: Hash, status: string, error: string): void {
    const history = store.get(historyAtom)
    const index = history.findIndex((entry) => entry.boopHash === boopHash)
    if (index < 0) {
        reqLogger.error("Updating non-existing entry", boopHash)
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
        // both are pending, the regular comparison logic applies between them
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
