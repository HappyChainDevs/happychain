import { getDefaultStore } from "jotai"
import type { Address, Hash, TransactionReceipt } from "viem"
import { getPublicClient } from "../state/publicClient"
import { confirmedTxsAtom, pendingTxsAtom } from "../state/txHistory"

const store = getDefaultStore()

export function addConfirmedTx(address: Address, receipt: TransactionReceipt) {
    store.set(confirmedTxsAtom, (existingEntries) => {
        const userHistory = existingEntries[address] || []
        const isReceiptAlreadyLogged = userHistory.includes(receipt)

        if (isReceiptAlreadyLogged) {
            console.warn("Abnormal scenario")
            return existingEntries
        }

        return {
            ...existingEntries,
            [address]: [receipt, ...userHistory],
        }
    })
}

function monitorTransactionHash(address: Address, hash: Hash) {
    const publicClient = getPublicClient()

    void publicClient
        .waitForTransactionReceipt({ hash })
        .then((receipt) => {
            if (!receipt) {
                throw new Error(`Receipt not found for transaction hash: ${hash}`)
            }

            // Add the tx receipt to confirmed history
            addConfirmedTx(address, receipt)
            // Remove the tx hash from the pending list
            removePendingTxEntry(address, hash)
        })
        .catch((error) => {
            console.error(`Error monitoring transaction receipt for hash: ${hash}`, error)
        })
}

export function addPendingTxEntry(address: Address, newHash: Hash) {
    store.set(pendingTxsAtom, (existingEntries) => {
        const pendingTxHashesByUser = existingEntries[address] || []
        const isHashAlreadyPending = pendingTxHashesByUser.includes(newHash)

        if (isHashAlreadyPending) {
            console.warn("Abnormal scenario")
            return existingEntries
        }

        monitorTransactionHash(address, newHash) // Start monitoring
        return {
            ...existingEntries,
            [address]: [newHash, ...pendingTxHashesByUser],
        }
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
