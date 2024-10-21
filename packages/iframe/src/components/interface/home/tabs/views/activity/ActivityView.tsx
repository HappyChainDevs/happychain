import { useAtomValue } from "jotai"

import { userAtom } from "../../../../../../state/user"

import { confirmedTxsAtom, pendingTxsAtom } from "../../../../../../state/txHistory"
import TxLoadingSkeleton from "./TxLoadingSkeleton"
import TxLogEntry from "./TxLogEntry"

/**
 * Displays HappyUser's recent transaction history.
 * TxReceipts are fetched from the atom, and user specific
 * receipts are deserialized and then fed into the child component.
 *
 * If there a tx that has just been sent (pending state), a skeleton is rendered
 * to denote the same.
 * */
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
        <div className="flex flex-col w-full max-h-4/5 overflow-y-auto p-2 bg-slate-300 rounded-b-xl rounded-tr-xl">
            {userPendingTxs.length > 0 && userPendingTxs.map((tx) => <TxLoadingSkeleton key={tx.hash} tx={tx.hash} />)}

            {userTxHistory.length > 0 &&
                // biome-ignore lint/suspicious/noArrayIndexKey: type TransactionReceipt doesn't make for a good key
                userTxHistory.map((tx, index) => <TxLogEntry key={index} tx={tx} />)}
        </div>
    )
}

export default ActivityView
