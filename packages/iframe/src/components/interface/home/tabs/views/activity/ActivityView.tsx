import { useAtomValue } from "jotai"
import type { TransactionReceipt } from "viem"
import { deserialize } from "wagmi"
import { PendingTxHashesAtom } from "../../../../../../state/pendingTxs"
import { txHistoryAtom } from "../../../../../../state/txHistory"
import { userAtom } from "../../../../../../state/user"
import LoadingSkeleton from "../../../../LoadingSkeleton"
import TxLogEntry from "./TxLogEntry"

/** Displays HappyUser's recent transaction history. */
const ActivityView = () => {
    const user = useAtomValue(userAtom)
    const txHistory = useAtomValue(txHistoryAtom)
    const pendingTxs = useAtomValue(PendingTxHashesAtom)

    if (!user) {
        return <div>No user connected.</div>
    }

    const userTxHistory = txHistory[user.address] || []
    const userPendingTxs = pendingTxs[user.address] || []

    if (userTxHistory.length === 0 && userPendingTxs.length === 0) {
        return <div>No transactions to display.</div>
    }

    return (
        <div className="flex flex-col w-full space-y-2 h-4/5 p-2 bg-slate-300 rounded-b-xl rounded-tr-xl">
            {userTxHistory.length > 0 &&
                userTxHistory.map((tx) => <TxLogEntry key={tx} tx={deserialize(tx) as TransactionReceipt} />)}

            {userPendingTxs.length > 0 && <LoadingSkeleton />}
        </div>
    )
}

export default ActivityView
