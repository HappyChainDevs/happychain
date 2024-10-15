import { atomWithStorage } from "jotai/utils"
import type { Address, Hash } from "viem"
import { StorageKey } from "../services/storage"

export type TxHistory = Record<Address, string[]>
export type PendingTxHistoryRecord = Record<Address, Hash[]>

/**
 * Atom to manage recent (confirmed) transaction history mapped to a user's address, using localStorage.
 * Transaction receipts are stored in a 'serialized` format (using the wagmi helper).
 */
export const confirmedTxsAtom = atomWithStorage<TxHistory>(StorageKey.TxHistory, {})

/**
 * Atom to store pending transaction hashes mapped to user's address, using localStorage.
 */
export const pendingTxsAtom = atomWithStorage<PendingTxHistoryRecord>(StorageKey.PendingTxs, {})
