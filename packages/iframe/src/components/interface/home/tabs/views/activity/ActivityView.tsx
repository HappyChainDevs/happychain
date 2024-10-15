import { useAtomValue } from "jotai"
import type { TransactionReceipt } from "viem"
import { deserialize } from "wagmi"
import { confirmedTxsAtom, pendingTxsAtom } from "../../../../../../state/txHistory"
import { userAtom } from "../../../../../../state/user"
import LoadingSkeleton from "../../../../LoadingSkeleton"
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
        <div className="flex flex-col w-full space-y-2 h-4/5 p-2 bg-slate-300 rounded-b-xl rounded-tr-xl overflow-y-auto">
            {userPendingTxs.length > 0 && <LoadingSkeleton />}

            {userTxHistory.length > 0 &&
                userTxHistory.map((tx) => <TxLogEntry key={tx} tx={deserialize(tx) as TransactionReceipt} />)}
        </div>
    )
}

export default ActivityView
