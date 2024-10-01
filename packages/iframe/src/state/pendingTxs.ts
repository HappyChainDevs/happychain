import { atomWithStorage } from "jotai/utils"
import type { Address, Hash } from "viem"

export type PendingTxHistoryRecord = Record<Address, Hash[]>

/**
 * Atom to manage transaction hashes (pending) mapped to user's address, using localStorage.
 */
export const PendingTxHashesAtom = atomWithStorage<PendingTxHistoryRecord>("pending_tx_hashes", {})
