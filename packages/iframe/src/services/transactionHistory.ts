import { getDefaultStore } from "jotai"
import type { Address, Hash, TransactionReceipt } from "viem"
import { serialize } from "wagmi"
import { pendingTxHashesAtom } from "../state/pendingTxs"
import { getPublicClient } from "../state/publicClient"
import { txHistoryAtom } from "../state/txHistory"
import { getUser } from "../state/user"

/**
 * When a new transaction hash is added to the pending transactions atom, Viem's 
 * {@link https://viem.sh/docs/actions/public/waitForTransactionReceipt.html | waitForTransactionReceipt}
 * function is called to monitor the transaction and retrieve the `TransactionReceipt` once it is included in a block.
 * 
 * Once a receipt is obtained:
 * - It is serialized and stored in the `txHistoryAtom` to maintain a log of completed transactions for the user.
 * - The transaction hash is removed from the `pendingTxHashesAtom` as the transaction is no longer pending.
 * 
 * The `Activity` Tab can then display the transaction history by reading from the `txHistoryAtom`.
 * 
 * In summary:
 * 1. A pending transaction hash is added to `pendingTxHashesAtom` after the user sends a transaction.
 * 2. `subscribeToPendingTxAtom` processes this hash and waits for the corresponding transaction to be included in a block.
 * 3. Once the `TransactionReceipt` is received, it is stored in `txHistoryAtom` and removed from `pendingTxHashesAtom`.
 */

// -------------------------------------------------------------------------------------------------

const store = getDefaultStore()

export function addHistoryLogEntry(address: Address, entry: TransactionReceipt) {
    store.set(txHistoryAtom, (existingEntries) => {
        const userHistory = existingEntries[address] || []
        return {
            ...existingEntries,
            [address]: [serialize(entry), ...userHistory],
        }
    })
}

export function addPendingTxEntry(address: Address, newHash: Hash) {
    let entryExists = false
    store.set(pendingTxHashesAtom, (existingEntries) => {
        const pendingTxHashes = existingEntries[address] || []
        entryExists = pendingTxHashes.some((pendingHash) => pendingHash === newHash)

        return entryExists
            ? existingEntries
            : {
                  ...existingEntries,
                  [address]: [newHash, ...pendingTxHashes],
              }
    })
    return !entryExists
}

export function removePendingTxEntry(address: Address, hash: Hash) {
    store.set(pendingTxHashesAtom, (existingEntries) => {
        const pendingTxHashes = existingEntries[address] || []

        // Filter out the hash to be removed
        const updatedHashes = pendingTxHashes.filter((pendingHash) => pendingHash !== hash)

        // If the updatedHashes is empty, remove the address entry from the record
        if (updatedHashes.length === 0) {
            const { [address]: _, ...remainingEntries } = existingEntries
            return remainingEntries
        }

        // Return the updated record
        return {
            ...existingEntries,
            [address]: updatedHashes,
        }
    })
}

/**
 * Subscribes to changes in the `pendingTxHashesAtom`, uses viem's
 * {@link https://viem.sh/docs/actions/public/waitForTransactionReceipt.html | waitForTransactionReceipt}
 * to fetch the associated `TransactionReceipt` once the tx is included in a block.
 */
export const subscribeToPendingTxAtom = store.sub(pendingTxHashesAtom, () => {
    const user = getUser()
    const publicClient = getPublicClient()

    if (!user) {
        console.warn("No user found, can't access tx history.")
        return
    }

    const pendingTxHashes = store.get(pendingTxHashesAtom)
    const hashList = pendingTxHashes[user.address]

    if (!hashList || hashList.length === 0) {
        console.warn("No pending transactions found for this user.")
        return
    }

    hashList.forEach((hash) => {
        publicClient.waitForTransactionReceipt({ hash }).then((receipt) => {
            if (!receipt) {
                throw new Error(`Receipt not found for transaction hash: ${hash}`)
            }

            // once receipt is found, add it to the user's transaction history
            addHistoryLogEntry(user.address, receipt)
            // Remove the hash from pending atom since it's no longer 'pending'
            removePendingTxEntry(user.address, hash)
        })
    })
})
