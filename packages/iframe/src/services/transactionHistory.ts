import { getDefaultStore } from "jotai"
import type { Address, Hash, TransactionReceipt } from "viem"
import { setTxSendState } from "../state/interfaceState"
import { getPublicClient } from "../state/publicClient"
import { confirmedTxsAtom, pendingTxsAtom } from "../state/txHistory"

/**
 * When a new transaction hash is added to the `pendingTxsAtom`, Viem's
 * {@link https://viem.sh/docs/actions/public/waitForTransactionReceipt.html | waitForTransactionReceipt}
 * function is called to monitor the transaction and retrieve the `TransactionReceipt` once it is included in a block.
 *
 * Once the receipt is obtained:
 * - The receipt is serialized and stored in the `confirmedTxsAtom` to maintain a log of completed transactions for the user.
 * - The transaction hash is removed from the `pendingTxsAtom`, as the transaction is no longer pending.
 *
 * The `Activity` Tab can then display the transaction history by reading from the `confirmedTxsAtom`.
 *
 * In summary:
 * 1. A pending transaction hash is added to `pendingTxsAtom` when the user sends a transaction.
 * 2. The `addPendingTxEntry` function processes this hash and starts monitoring the transaction by calling
 *    {@link https://viem.sh/docs/actions/public/waitForTransactionReceipt.html | waitForTransactionReceipt}.
 * 3. Once the `TransactionReceipt` is received:
 *    - It is serialized and added to the `confirmedTxsAtom`.
 *    - The corresponding hash is removed from the `pendingTxsAtom`.
 *
 * This ensures that the transaction history is updated in real-time as transactions are confirmed.
 */

const store = getDefaultStore()

export function addHistoryLogEntry(address: Address, receipt: TransactionReceipt) {
    store.set(confirmedTxsAtom, (existingEntries) => {
        const userHistory = existingEntries[address] || []
        const isReceiptAlreadyLogged = userHistory.includes(receipt)

        if (!isReceiptAlreadyLogged) {
            return {
                ...existingEntries,
                [address]: [receipt, ...userHistory],
            }
        }

        return existingEntries
    })
}

/**
 * Handles waiting for the transaction receipt and updates the state accordingly.
 * It waits for the transaction to be included in a block, adds it to the `confirmedTxsAtom`,
 * and removes it from the `pendingTxsAtom`.
 * Uses viem's {@link https://viem.sh/docs/actions/public/waitForTransactionReceipt.html | waitForTransactionReceipt}
 * to fetch the associated `TransactionReceipt` once the tx is included in a block.
 */
function monitorTransactionReceipt(address: Address, hash: Hash) {
    const publicClient = getPublicClient()

    publicClient
        .waitForTransactionReceipt({ hash })
        .then((receipt) => {
            if (!receipt) {
                throw new Error(`Receipt not found for transaction hash: ${hash}`)
            }

            // set UI state for pending tx
            setTxSendState(false)
            // Add the transaction receipt to confirmed history
            addHistoryLogEntry(address, receipt)
            // Remove the transaction from the pending list
            removePendingTxEntry(address, hash)
        })
        .catch((error) => {
            console.error(`Error monitoring transaction receipt for hash: ${hash}`, error)
        })
}

export function addPendingTxEntry(address: Address, newHash: Hash) {
    store.set(pendingTxsAtom, (existingEntries) => {
        const pendingTxHashes = existingEntries[address] || []
        const isHashAlreadyPending = pendingTxHashes.includes(newHash)

        // If the hash is already being tracked, do nothing
        if (!isHashAlreadyPending) {
            setTxSendState(true)
            monitorTransactionReceipt(address, newHash) // Start monitoring
            return {
                ...existingEntries,
                [address]: [newHash, ...pendingTxHashes],
            }
        }

        return existingEntries
    })
}

export function removePendingTxEntry(address: Address, hash: Hash) {
    store.set(pendingTxsAtom, (existingEntries) => {
        const updatedHashes = (existingEntries[address] || []).filter((pendingHash) => pendingHash !== hash)

        // If no pending transactions remain for the user, remove the user's entry
        if (updatedHashes.length === 0) {
            const { [address]: _, ...remainingEntries } = existingEntries
            return remainingEntries
        }

        return {
            ...existingEntries,
            [address]: updatedHashes,
        }
    })
}
