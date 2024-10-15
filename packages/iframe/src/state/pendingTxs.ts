import { atomWithStorage } from "jotai/utils"
import type { Address, Hash } from "viem"

export type PendingTxHistoryRecord = Record<Address, Hash[]>

/**
 * Atom to store pending transaction hashes mapped to user's address, using localStorage.
 */
export const pendingTxHashesAtom = atomWithStorage<PendingTxHistoryRecord>("pending_tx_hashes", {})
