import { createBigIntStorage } from "@happychain/common"
import { atomWithStorage } from "jotai/utils"
import type { Address, Hash, TransactionReceipt } from "viem"
import { StorageKey } from "../services/storage"

/**
 * Represents the details of a pending transaction,
 * including the transaction hash and an optional value.
 */
export type PendingTxDetails = {
    hash: Hash
    value: bigint
}

/**
 * Extension of the {@link TransactionReceipt} type to account for an optional send value.
 */
export type TxInfo = {
    receipt: TransactionReceipt
    value: bigint
}

/**
 * Atom to store confirmed transaction records in localStorage.
 * - This atom is initialized with an empty object (`{}`) if no transactions are stored.
 * - Transactions are retrieved and saved using the `createBigIntStorage` with proper handling of BigInt values.
 */
export const confirmedTxsAtom = atomWithStorage<Record<Address, TxInfo[]>>(
    StorageKey.ConfirmedTxs,
    {},
    createBigIntStorage<Record<Address, TxInfo[]>>(),
)

/**
 * Atom to store pending transaction history in localStorage.
 * - This atom is initialized with an empty object (`{}`) if no pending transactions are stored.
 * - Pending transactions are stored in their raw format without any special serialization logic.
 */
export const pendingTxsAtom = atomWithStorage<Record<Address, PendingTxDetails[]>>(
    StorageKey.PendingTxs,
    {},
    createBigIntStorage<Record<Address, PendingTxDetails[]>>(),
)
