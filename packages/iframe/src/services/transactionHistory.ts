import { getDefaultStore } from "jotai"
import type { Address, TransactionReceipt } from "viem"
import { getPublicClient } from "../state/publicClient"
import { type PendingTxDetails, confirmedTxsAtom, pendingTxsAtom } from "../state/txHistory"

/**
 * When a new transaction hash is added to the `pendingTxsAtom`, Viem's
 * {@link https://viem.sh/docs/actions/public/waitForTransactionReceipt.html | waitForTransactionReceipt}
 * function is called to monitor the transaction and retrieve the `TransactionReceipt` once it is included in a block.
 *
 * Once the receipt is obtained:
 * - The receipt is serialized and stored in the `confirmedTxsAtom` to maintain a log of completed transactions for the user.
 * - The transaction hash is removed from the `pendingTxsAtom`, as the transaction is no longer 'pending'.
 *
 * The `Activity` Tab can then display the transaction history by reading from the `confirmedTxsAtom`.
 * This ensures that the transaction history is updated in real-time as transactions are confirmed.
 */

const store = getDefaultStore()

export function addConfirmedTx(address: Address, receipt: TransactionReceipt, value?: bigint) {
    store.set(confirmedTxsAtom, (existingEntries) => {
        const userHistory = existingEntries[address] || []
        const isReceiptAlreadyLogged = userHistory.includes(receipt)

        /**
         * for this case to be reached, it would require:
         * 1. the exact same transaction to be sent twice
         *      - an app could indeed easily do this — needs some ingress checking
         * 2. that transaction to successfully be submitted
         *    (hash obtained) both times
         */
        if (isReceiptAlreadyLogged) {
            console.warn("(⊙_⊙) abnormal scenario (⊙_⊙)")
            return existingEntries
        }

        return {
            ...existingEntries,
            [address]: [{ ...receipt, sendValue: value }, ...userHistory],
        }
    })
}

/**
 * Handles waiting for the tx receipt and updates the atom state accordingly.
 * It waits for the transaction to be included in a block, adds it to `confirmedTxsAtom`,
 * and removes it from `pendingTxsAtom`.
 * Uses viem's {@link https://viem.sh/docs/actions/public/waitForTransactionReceipt.html | waitForTransactionReceipt}
 * method to fetch the associated `TransactionReceipt` once the tx is included in a block.
 */
function monitorTransactionHash(address: Address, payload: PendingTxDetails) {
    const publicClient = getPublicClient()

    void publicClient
        .waitForTransactionReceipt({ hash: payload.hash })
        .then((receipt) => {
            if (!receipt) {
                throw new Error(`Receipt not found for transaction hash: ${payload.hash}`)
            }

            // Add the tx receipt to confirmed history
            addConfirmedTx(address, receipt, payload.value)
            // Remove the tx hash from the pending list
            removePendingTxEntry(address, payload)
        })
        .catch((error) => {
            console.error(`Error monitoring transaction receipt for hash: ${payload.hash}`, error)
        })
}

export function addPendingTxEntry(address: Address, payload: PendingTxDetails) {
    store.set(pendingTxsAtom, (existingEntries) => {
        const pendingTxEntriesByUser = existingEntries[address] || []
        const isHashAlreadyPending = pendingTxEntriesByUser.includes(payload)

        if (isHashAlreadyPending) {
            console.warn("(⊙_⊙) abnormal scenario (⊙_⊙)")
            return existingEntries
        }

        monitorTransactionHash(address, payload)
        return {
            ...existingEntries,
            [address]: [payload, ...pendingTxEntriesByUser],
        }
    })
}

export function removePendingTxEntry(address: Address, payload: PendingTxDetails) {
    store.set(pendingTxsAtom, (existingEntries) => {
        const updatedEntries = (existingEntries[address] || []).filter(
            (pendingPayload) => pendingPayload.hash !== payload.hash,
        )
        console.log({ updatedEntries })

        // If no pending transactions remain for the user, remove the user's entry
        if (updatedEntries.length === 0) {
            const { [address]: _, ...remainingEntries } = existingEntries
            return remainingEntries
        }

        return {
            ...existingEntries,
            [address]: updatedEntries,
        }
    })
}
