import { atomWithStorage, createJSONStorage } from "jotai/utils"
import type { Address, Hash, TransactionReceipt } from "viem"
import { serialize, deserialize } from "wagmi"
import { StorageKey } from "../services/storage"

export type TxHistory = Record<Address, TransactionReceipt[]>
export type PendingTxHistoryRecord = Record<Address, Hash[]>

/**
 * Atom to manage recent (confirmed) transaction history mapped to a user's address, using localStorage.
 * Transaction receipts are stored using the {@link serialize} helper.
 */
const confirmedTxsStorage = createJSONStorage<TxHistory>(() => localStorage, {
    replacer: (_key, value) => {
        if (value && typeof value === "object" && "blockHash" in value) {
            // This is likely a TransactionReceipt, so serialize it
            return serialize(value as TransactionReceipt)
        }
        return value
    },
    reviver: (_key, value) => {
        if (typeof value === "string" && value.startsWith("0x")) {
            try {
                return deserialize(value) as TransactionReceipt
            } catch {
                // If deserialization fails, return the original value
                return value
            }
        }
        return value
    },
})

export const confirmedTxsAtom = atomWithStorage<TxHistory>(StorageKey.TxHistory, {}, confirmedTxsStorage)

/**
 * Atom to store pending transaction hashes mapped to user's address, using localStorage.
 */
export const pendingTxsAtom = atomWithStorage<PendingTxHistoryRecord>(StorageKey.PendingTxs, {})
