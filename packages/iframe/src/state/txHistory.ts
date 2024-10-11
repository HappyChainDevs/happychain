import { atomWithStorage } from "jotai/utils"
import type { Address } from "viem"

export type TxHistory = Record<Address, string[]>

/**
 * Atom to manage transaction history mapped to user's address, using localStorage.
 */
export const txHistoryAtom = atomWithStorage<TxHistory>("txHistory", {})
