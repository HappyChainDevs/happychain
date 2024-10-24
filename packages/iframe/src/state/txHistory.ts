import { atomWithStorage, createJSONStorage } from "jotai/utils"
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
