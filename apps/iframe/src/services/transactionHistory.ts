import { getDefaultStore } from "jotai"
import { type Address, hexToNumber, stringToHex } from "viem"

import { getBalanceQueryKey } from "wagmi/query"

import { getCurrentChain } from "#src/state/chains"
import { getPublicClient } from "#src/state/publicClient"
import { type PendingTxDetails, type TxInfo, confirmedTxsAtom, pendingTxsAtom } from "#src/state/txHistory"
import { getUser } from "#src/state/user"
import { queryClient } from "#src/tanstack-query/config"

/**
 * When a new transaction hash is added to the `pendingTxsAtom`, Viem's
 * {@link https://viem.sh/docs/actions/public/waitForTransactionReceipt.html | waitForTransactionReceipt}
 * function is called to monitor the transaction and retrieve the `TransactionReceipt` once it is included in a block.
 *
 * Once the receipt is obtained:
 * - The receipt is stored in the `confirmedTxsAtom` to maintain a log of completed transactions for the user.
 * - The transaction hash is removed from the `pendingTxsAtom`, as the transaction is no longer 'pending'.
 *
 * The `Activity` Tab can then display the transaction history by reading from the `confirmedTxsAtom`.
 * This ensures that the transaction history is updated in real-time as transactions are confirmed.
 */

const store = getDefaultStore()

export function addPendingTx(address: Address, payload: PendingTxDetails) {
    store.set(pendingTxsAtom, (existingEntries) => {
        const pendingTxEntriesByUser = existingEntries[address] || []
        const isHashAlreadyPending = pendingTxEntriesByUser.includes(payload)

        if (isHashAlreadyPending) {
            console.warn("(⊙_⊙) pending transaction already recorded (⊙_⊙)")
            return existingEntries
        }

        void monitorTransactionHash(address, payload)
        const next = {
            ...existingEntries,
            [address]: [payload, ...pendingTxEntriesByUser],
        }

        return next
    })
}

/**
 * Handles waiting for the tx receipt and updates the atom state accordingly.
 * It waits for the transaction to be included in a block, adds it to `confirmedTxsAtom`,
 * and removes it from `pendingTxsAtom`.
 * Uses viem's {@link https://viem.sh/docs/actions/public/waitForTransactionReceipt.html | waitForTransactionReceipt}
 * method to fetch the associated `TransactionReceipt` once the tx is included in a block.
 */
async function monitorTransactionHash(address: Address, payload: PendingTxDetails) {
    const receipt = await getPublicClient().waitForTransactionReceipt({ hash: payload.hash })
    if (receipt) {
        // Add the tx receipt to confirmed history
        addConfirmedTx(address, { receipt, value: payload.value })
        // Remove the tx hash from the pending list
        removePendingTx(address, payload)
        // invalidate queryKey to refetch balance post tx confirmation
        queryClient.invalidateQueries({
            queryKey: getBalanceQueryKey({
                address: getUser()?.address,
                chainId: hexToNumber(stringToHex(getCurrentChain().chainId)),
            }),
        })
    } else {
        console.warn(`Error monitoring transaction receipt for hash: ${payload.hash}`)
    }
}

export function removePendingTx(address: Address, payload: PendingTxDetails) {
    store.set(pendingTxsAtom, (existingEntries) => {
        const updatedEntries = (existingEntries[address] || []).filter(
            (pendingPayload) => pendingPayload.hash !== payload.hash,
        )

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

export function addConfirmedTx(address: Address, txInfo: TxInfo) {
    store.set(confirmedTxsAtom, (existingEntries) => {
        const userHistory = existingEntries[address] || []
        const isReceiptAlreadyLogged = userHistory.includes(txInfo)

        if (isReceiptAlreadyLogged) {
            console.warn("(⊙_⊙) transaction already confirmed — this should never happen (⊙_⊙)")
            return existingEntries
        }

        return {
            ...existingEntries,
            [address]: [txInfo, ...userHistory],
        }
    })
}
