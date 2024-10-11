import { useAtomValue } from "jotai"
import { deserialize } from "wagmi"
import { txHistoryAtom } from "../../../../../../state/txHistory"
import { userAtom } from "../../../../../../state/user"
import TxLogEntry from "./TxLogEntry"

/** Displays HappyUser's recent transaction history. */
const ActivityView = () => {
    const user = useAtomValue(userAtom)
    const txHistory = useAtomValue(txHistoryAtom)

    return (
        <div className="flex flex-col w-full h-4/5 p-2 bg-slate-300 rounded-b-xl rounded-tr-xl">
            {user && txHistory[user.address] && txHistory[user.address].length > 0 ? (
                txHistory[user?.address].map((tx) => <TxLogEntry key={tx} tx={deserialize(tx)} />)
            ) : (
                <div>No recent transactions.</div>
            )}
        </div>
    )
}

export default ActivityView
