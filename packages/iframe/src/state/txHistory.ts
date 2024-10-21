import { atomWithStorage, createJSONStorage } from "jotai/utils"
import type { Address, Hash, TransactionReceipt } from "viem"
import { StorageKey } from "../services/storage"

export type TxRecord<T> = Record<Address, T[]>

/**
 * Represents the details of a pending transaction,
 * including the transaction hash and an optional value.
 */
export type PendingTxDetails = {
    hash: Hash
    value?: string
}

/**
 * Record of pending transactions, organized by the sender's address.
 * Each address maps to an array of pending transaction details.
 */
export type PendingTxHistoryRecord = TxRecord<PendingTxDetails>

/**
 * Record of confirmed transactions, organized by the sender's address.
 * Each address maps to an array of transaction receipts (confirmations).
 */
export type ConfirmedTransactionsRecord = TxRecord<TransactionReceipt>

/**
 * Creates a storage mechanism for confirmed transactions using localStorage.
 * - This implementation handles the serialization and deserialization of `bigint` values.
 * - BigInt values are stringified during storage and restored upon retrieval using a custom replacer and reviver.
 */
const confirmedTxsStorage = createJSONStorage<ConfirmedTransactionsRecord>(() => localStorage, {
    replacer: (_key, value) => (typeof value === "bigint" ? `#bigint.${value}` : value),
    reviver: (_key, value) =>
        typeof value === "string" && value.startsWith("#bigint.") ? BigInt(value.slice(8)).valueOf() : value,
})

/**
 * Atom to store confirmed transaction records in localStorage.
 * - This atom is initialized with an empty object (`{}`) if no transactions are stored.
 * - Transactions are retrieved and saved using the `confirmedTxsStorage` with proper handling of BigInt values.
 */
export const confirmedTxsAtom = atomWithStorage<ConfirmedTransactionsRecord>(
    StorageKey.ConfirmedTxs,
    {},
    confirmedTxsStorage,
)

/**
 * Atom to store pending transaction history in localStorage.
 * - This atom is initialized with an empty object (`{}`) if no pending transactions are stored.
 * - Pending transactions are stored in their raw format without any special serialization logic.
 */
export const pendingTxsAtom = atomWithStorage<PendingTxHistoryRecord>(StorageKey.PendingTxs, {})
