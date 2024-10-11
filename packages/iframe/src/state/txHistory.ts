import { atomWithStorage } from "jotai/utils"
import type { Address } from "viem"

export type TxHistory = Record<Address, string[]>

/**
 * Atom to manage transaction history mapped to user's address, using localStorage.
 * Transaction receipts are stored in a 'serialized` format (using the wagmi helper).
 * When receipts are read from here, they're then deserialized in the parent `ActivityView`
 * component, then fed into the `TxLogEntry` component for view.
 */
export const txHistoryAtom = atomWithStorage<TxHistory>("txHistory", {})
