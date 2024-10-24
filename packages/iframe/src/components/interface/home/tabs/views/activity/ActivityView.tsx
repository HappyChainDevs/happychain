import { useAtomValue } from "jotai"

import { userAtom } from "../../../../../../state/user"

import { confirmedTxsAtom, pendingTxsAtom } from "../../../../../../state/txHistory"
import TxLoadingSkeleton from "./TxLoadingSkeleton"
import TxLogEntry from "./TxLogEntry"

/**
 * Displays HappyUser's recent transaction history.
 * TxReceipts are fetched from the atom, and user specific
 * receipts are fed into the child component.
 *
 * For transactions that haven't been confirmed yet, a skeleton is rendered.
 */
const ActivityView = () => {
    const user = useAtomValue(userAtom)
    const txHistory = useAtomValue(confirmedTxsAtom)
    const pendingTxs = useAtomValue(pendingTxsAtom)

    if (!user) {
        return <div className="w-full h-full p-2">No user connected.</div>
    }

    const userTxHistory = txHistory[user.address] || []
    const userPendingTxs = pendingTxs[user.address] || []

    if (userTxHistory.length === 0 && userPendingTxs.length === 0) {
        return <div className="w-full h-full p-2">No transactions to display.</div>
    }

    return (
        <div className="flex flex-col w-full max-h-4/5 overflow-y-auto p-2 bg-slate-300 rounded-b-xl rounded-tr-xl space-y-1">
            {userPendingTxs.length > 0 && userPendingTxs.map((tx) => <TxLoadingSkeleton key={tx.hash} tx={tx.hash} />)}
            {userTxHistory.length > 0 &&
                userTxHistory.map((tx) => <TxLogEntry key={tx.receipt.transactionHash} tx={tx} />)}
        </div>
    )
}

export default ActivityView
