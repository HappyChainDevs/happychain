import { atomWithStorage, createJSONStorage } from "jotai/utils"
import type { Address, Hash, TransactionReceipt, TransactionType } from "viem"
import { StorageKey } from "../services/storage"

export type TxRecord<T> = Record<Address, T[]>

/**
 * Represents the details of a pending transaction,
 * including the transaction hash and an optional value.
 */
export type PendingTxDetails = {
    hash: Hash
    value?: bigint
}

/**
 * Record of pending transactions, organized by the sender's address.
 * Each address maps to an array of pending transaction details.
 */
export type PendingTxHistoryRecord = TxRecord<PendingTxDetails>

/**
 * Extension of the {@link TransactionReceipt} type to account for an optional send value.
 */
export type ExtendedTransactionReceipt<
    quantity = bigint,
    index = number,
    status = "success" | "reverted",
    type = TransactionType,
> = TransactionReceipt<quantity, index, status, type> & {
    /** Optional value sent with the transaction, represented as a hex string */
    sendValue?: bigint
}

/**
 * Record of confirmed transactions, organized by the sender's address.
 * Each address maps to an array of transaction receipts (confirmations).
 */
export type ConfirmedTransactionsRecord = TxRecord<ExtendedTransactionReceipt>

/**
 * Utility function to create a JSON storage with custom handling of `bigint` values.
 * - BigInt values are stringified during storage and restored upon retrieval using a custom replacer and reviver.
 * - This utility can be used for any atom that stores data containing `bigint`.
 */
const createBigIntStorage = <T>() =>
    createJSONStorage<T>(() => localStorage, {
        replacer: (_key, value) => (typeof value === "bigint" ? `#bigint.${value}` : value),
        reviver: (_key, value) =>
            typeof value === "string" && value.startsWith("#bigint.") ? BigInt(value.slice(8)).valueOf() : value,
    })

/**
 * Atom to store confirmed transaction records in localStorage.
 * - This atom is initialized with an empty object (`{}`) if no transactions are stored.
 * - Transactions are retrieved and saved using the `createBigIntStorage` with proper handling of BigInt values.
 */
export const confirmedTxsAtom = atomWithStorage<ConfirmedTransactionsRecord>(
    StorageKey.ConfirmedTxs,
    {},
    createBigIntStorage<ConfirmedTransactionsRecord>(),
)

/**
 * Atom to store pending transaction history in localStorage.
 * - This atom is initialized with an empty object (`{}`) if no pending transactions are stored.
 * - Pending transactions are stored in their raw format without any special serialization logic.
 */
export const pendingTxsAtom = atomWithStorage<PendingTxHistoryRecord>(
    StorageKey.PendingTxs,
    {},
    createBigIntStorage<PendingTxHistoryRecord>(),
)
