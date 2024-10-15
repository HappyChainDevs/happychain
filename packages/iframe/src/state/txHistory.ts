import { atomWithStorage } from "jotai/utils"
import type { Address } from "viem"

export type TxHistory = Record<Address, string[]>

/**
 * Atom to manage recent (confirmed) transaction history mapped to a user's address, using localStorage.
 * Transaction receipts are stored in a 'serialized` format (using the wagmi helper).
 */
export const txHistoryAtom = atomWithStorage<TxHistory>("txHistory", {})
