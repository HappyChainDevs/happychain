import { getDefaultStore } from "jotai"
import type { Address, Hash, TransactionReceipt } from "viem"
import { serialize } from "wagmi"
import { PendingTxHashesAtom, type PendingTxHistoryRecord } from "../state/pendingTxs"
import { getPublicClient } from "../state/publicClient"
import { type TxHistory, txHistoryAtom } from "../state/txHistory"
import { getUser } from "../state/user"

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
    console.log({ address, newReceipt })
    store.set(txHistoryAtom, (existingRecords) => {
        const userHistory = existingRecords[address] || []
        return {
            ...existingRecords,
            [address]: [serialize(newReceipt), ...userHistory],
        }
    })
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

export const subscribeToPendingTxAtom = store.sub(PendingTxHashesAtom, () => {
    const user = getUser()
    const publicClient = getPublicClient()
    if (!user) {
        console.warn("No user found, can't access tx history.")
        return
    }
    const hashesByUser = store.get(PendingTxHashesAtom)
    const hashList = hashesByUser[user?.address]

    // fetch tx receipt
    publicClient.getTransactionReceipt({ hash: hashList[1] }).then((receipt) => {
        addUserTxHistory(user.address, receipt)
    })
})
