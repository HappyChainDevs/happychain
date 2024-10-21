import { atomWithStorage, createJSONStorage } from "jotai/utils"
import type { Address, Hash, TransactionReceipt } from "viem"
import { StorageKey } from "../services/storage"

export type ConfirmedTransactionsRecord = Record<Address, TransactionReceipt[]>
export type PendingTxHistoryRecord = Record<Address, Hash[]>

const confirmedTxsStorage = createJSONStorage<ConfirmedTransactionsRecord>(() => localStorage, {
    replacer: (_key, value) => (typeof value === "bigint" ? `#bigint.${value}` : value),
    reviver: (_key, value) =>
        typeof value === "string" && value.startsWith("#bigint.") ? BigInt(value.slice(8)).valueOf() : value,
})

export const confirmedTxsAtom = atomWithStorage<ConfirmedTransactionsRecord>(
    StorageKey.ConfirmedTxs,
    {},
    confirmedTxsStorage,
)

export const pendingTxsAtom = atomWithStorage<PendingTxHistoryRecord>(StorageKey.PendingTxs, {})
