import { getDefaultStore } from "jotai"
import type { Address, Hash, TransactionReceipt } from "viem"
import { PendingTxHashesAtom, type PendingTxHistoryRecord } from "../state/pendingTxs"
import { type TxHistory, txHistoryAtom } from "../state/txHistory"

/** When user sends a transaction, the hash generated is stored
 *  in the pending tx atom. On addition, it is processed by the `hooks/waitForReceipt` function
 *  which calls viem's `getTransactionReceipt` function to generate the full transaction receipt.
 *  This is then stored in the txHistory atom, which is then displayed in the `Activity` Tab.
 */

// -------------------------------------------------------------------------------------------------

const store = getDefaultStore()

export function getTxHistory(): TxHistory {
    return store.get(txHistoryAtom)
}

export function addUserTxHistory(address: Address, newReceipt: TransactionReceipt) {
    let recordExists = false
    store.set(txHistoryAtom, (existingRecords) => {
        const userHistory = existingRecords[address] || []
        recordExists = userHistory.some((log) => log.transactionHash === newReceipt.transactionHash)

        return recordExists
            ? existingRecords
            : {
                  ...existingRecords,
                  [address]: [newReceipt, ...userHistory],
              }
    })
    return !recordExists
}

export function getPendingTxHashes(): PendingTxHistoryRecord {
    return store.get(PendingTxHashesAtom)
}

export function addPendingTx(address: Address, newHash: Hash) {
    let recordExists = false
    store.set(PendingTxHashesAtom, (existingRecords) => {
        const pendingTxHashes = existingRecords[address] || []
        recordExists = pendingTxHashes.some((asset) => asset === newHash)

        return recordExists
            ? existingRecords
            : {
                  ...existingRecords,
                  [address]: [newHash, ...pendingTxHashes],
              }
    })
    return !recordExists
}

export const subscribeToPendingTxHashes = (callback: (newValue: PendingTxHistoryRecord) => void) => {
    const unsubscribe = store.sub(PendingTxHashesAtom, () => {
        const newValue = store.get(PendingTxHashesAtom)
        callback(newValue)
    })
    return unsubscribe
}
