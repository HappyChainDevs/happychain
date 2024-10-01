import { atomWithStorage } from "jotai/utils"
import type { Address, TransactionReceipt } from "viem"

export type TxHistory = Record<Address, TransactionReceipt[]>

/**
 * Atom to manage transaction history mapped to user's address, using localStorage.
 */
export const txHistoryAtom = atomWithStorage<TxHistory>("txHistory", {})
