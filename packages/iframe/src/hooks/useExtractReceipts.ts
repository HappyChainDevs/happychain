import { useEffect } from "react"
import type { Hash } from "viem"
import { useWaitForTransactionReceipt } from "wagmi"
import { subscribeToPendingTxHashes } from "../services/transactionHistory"

/**
 * Wrapper for `useWaitForTransactionReceipt`, returns `TransactionReceipt` for the given hash.
 * Uses `subscribeToPendingTxHashes` to log when a new value is added to the atom.
 */
export function useExtractReceipts(hash: Hash) {
    const { data } = useWaitForTransactionReceipt({ hash })

    useEffect(() => {
        console.log("Setting up subscription to PendingTxHashesAtom")

        const unsubscribe = subscribeToPendingTxHashes((newPendingTxs) => {
            console.log("Pending transactions updated:", newPendingTxs)

            // Optionally, check if the hash was newly added
            if (newPendingTxs) {
                console.log(`New transaction added: ${hash}`)
            }
        })

        // Cleanup the subscription on unmount
        return () => {
            console.log("Cleaning up subscription")
            unsubscribe()
        }
    }, [hash])

    return data
}
