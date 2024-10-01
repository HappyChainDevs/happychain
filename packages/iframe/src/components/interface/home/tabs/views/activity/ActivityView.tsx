import { useAtomValue } from "jotai"
import { PendingTxHashesAtom } from "../../../../../../state/pendingTxs"
import { userAtom } from "../../../../../../state/user"
import TxLogEntry from "./TxLogEntry"

/** Displays HappyUser's recent transaction history. */
const ActivityView = () => {
    const user = useAtomValue(userAtom)

    // be whole receipts, from the txHistory atom
    const pendingTxs = useAtomValue(PendingTxHashesAtom)

    return (
        <div className="flex flex-col w-full h-4/5 p-2 bg-slate-300 rounded-b-xl rounded-tr-xl">
            {user && pendingTxs[user.address] && pendingTxs[user.address].length > 0 ? (
                pendingTxs[user?.address].map((tx) => <TxLogEntry key={tx} tx={tx} />)
            ) : (
                <div>No recent transactions.</div>
            )}
        </div>
    )
}

export default ActivityView
