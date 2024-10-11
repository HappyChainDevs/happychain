import type { Hash } from "viem"
import { useWaitForTransactionReceipt } from "wagmi"

/**
 * Wrapper for `useWaitForTransactionReceipt`, returns `TransactionReceipt` for the given hash.
 * Uses `subscribeToPendingTxAtom` to log when a new value is added to the atom.
 */
export function useExtractReceipts(hash: Hash) {
    const { data } = useWaitForTransactionReceipt({ hash })

    // useEffect(() => {
    //     console.log("Setting up subscription to PendingTxHashesAtom")
    //     subscribeToPendingTxAtom()
    //     // Cleanup the subscription on unmount
    //     return () => {
    //         console.log("Cleaning up subscription")
    //         subscribeToPendingTxAtom()
    //     }
    // }, [])

    return data
}
