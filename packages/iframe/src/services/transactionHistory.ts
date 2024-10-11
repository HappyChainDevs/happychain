import { getDefaultStore } from "jotai"
import type { Address, Hash, TransactionReceipt } from "viem"
import { serialize } from "wagmi"
import { PendingTxHashesAtom, type PendingTxHistoryRecord } from "../state/pendingTxs"
import { getPublicClient } from "../state/publicClient"
import { txHistoryAtom } from "../state/txHistory"
import { getUser } from "../state/user"

/** When user sends a transaction, the hash generated is stored
 *  in the pending tx atom. On addition, it is processed by the `subscribeToPendingTxAtom` function
 *  which calls viem's `getTransactionReceipt` function to generate the full transaction receipt.
 *  This is then stored in the txHistory atom, which is then displayed in the `Activity` Tab.
 */

// -------------------------------------------------------------------------------------------------

const store = getDefaultStore()

export function addUserTxHistory(address: Address, newReceipt: TransactionReceipt) {
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

export function removePendingTx(address: Address, hash: Hash) {
    store.set(PendingTxHashesAtom, (existingRecords) => {
        const pendingTxHashes = existingRecords[address] || []

        // Filter out the hash to be removed
        const updatedHashes = pendingTxHashes.filter((asset) => asset !== hash)

        // If the updatedHashes is empty, remove the address entry from the record
        if (updatedHashes.length === 0) {
            const { [address]: _, ...remainingRecords } = existingRecords
            return remainingRecords
        }

        // Return the updated record
        return {
            ...existingRecords,
            [address]: updatedHashes,
        }
    })
}

/**
 * Subscribes to changes in the `PendingTxHashesAtom` and attempts to retrieve transaction receipts for
 * pending transactions of the current user. If a transaction receipt is successfully fetched, it is
 * added to the user's transaction history and removed from the pending transactions list.
 * If the receipt is not immediately available, it retries fetching the receipt a specified number
 * of times with a delay between each attempt.
 */

export const subscribeToPendingTxAtom = store.sub(PendingTxHashesAtom, () => {
    const user = getUser()
    const publicClient = getPublicClient()

    if (!user) {
        console.warn("No user found, can't access tx history.")
        return
    }

    const pendingTxHashes = store.get(PendingTxHashesAtom)
    const hashList = pendingTxHashes[user.address]

    if (!hashList || hashList.length === 0) {
        console.warn("No pending transactions found for this user.")
        return
    }

    const retryLimit = 5
    const retryDelay = 5000 //HappyChain blocks resolve in 2 seconds, so this might be overkill

    const fetchTransactionReceiptWithRetry = (hash: Hash, retryCount = 0) => {
        publicClient
            .getTransactionReceipt({ hash })
            .then((receipt) => {
                if (!receipt) {
                    throw new Error(`Receipt not found for transaction hash: ${hash}`)
                }

                // If receipt is found, add it to the user's transaction history
                addUserTxHistory(user.address, receipt)
                // Remove the hash from local storage since it's no longer 'pending'
                removePendingTx(user.address, hash)
            })
            .catch((error) => {
                console.warn(`Error fetching receipt for hash ${hash}. Attempt ${retryCount + 1}:`, error)

                if (retryCount < retryLimit) {
                    // Retry after a delay if retry count hasn't reached the limit
                    setTimeout(() => {
                        fetchTransactionReceiptWithRetry(hash, retryCount + 1)
                    }, retryDelay)
                } else {
                    console.warn(`Failed to fetch receipt after ${retryLimit} attempts. Giving up.`)
                }
            })
    }

    // Iterate over all hashes in the hashList and fetch their receipts
    hashList.forEach((hash) => {
        fetchTransactionReceiptWithRetry(hash)
    })
})
