import { useAtomValue } from "jotai"

import { confirmedTxsAtom, pendingTxsAtom } from "#src/state/txHistory"
import UserNotFoundWarning from "../UserNotFoundWarning"
import TxLoadingSkeleton from "./TxLoadingSkeleton"
import TxLogEntry from "./TxLogEntry"

import { userAtom } from "#src/state/user"
/**
 * Displays HappyUser's recent transaction history.
 * TxReceipts are fetched from the atom, and user specific
 * receipt information is fed into the child component.
 *
 * For transactions that haven't been confirmed yet, a skeleton is rendered.
 */
const ActivityView = () => {
    const user = useAtomValue(userAtom)
    const txHistory = useAtomValue(confirmedTxsAtom)
    const pendingTxs = useAtomValue(pendingTxsAtom)

    if (!user) return <UserNotFoundWarning />

    const userTxHistory = txHistory[user.address] || []
    const userPendingTxs = pendingTxs[user.address] || []

    if (userTxHistory.length === 0 && userPendingTxs.length === 0) {
        return <div className="rounded-es-xl rounded-e-xl size-full">No transactions to display.</div>
    }

    return (
        <div className="flex flex-col w-full max-h-4/5 overflow-y-auto p-2 bg-neutral-content rounded-b-xl rounded-se-xl space-y-1">
            {userPendingTxs.length > 0 &&
                userPendingTxs.map((tx) => <TxLoadingSkeleton key={`pending-tx-${tx.hash}`} tx={tx.hash} />)}
            {userTxHistory.length > 0 &&
                userTxHistory.map((tx) => <TxLogEntry key={`log-entry-${tx.receipt.transactionHash}`} tx={tx} />)}
        </div>
    )
}

export default ActivityView
