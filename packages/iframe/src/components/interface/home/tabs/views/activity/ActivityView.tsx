import { useAtomValue } from "jotai"
import { userTxsAtom } from "#src/state/txHistory"
import { userAtom } from "#src/state/user"
import UserNotFoundWarning from "../UserNotFoundWarning"
import TxLoadingSkeleton from "./TxLoadingSkeleton"
import TxLogEntry from "./TxLogEntry"

/**
 * Displays HappyUser's recent transaction history.
 * TxReceipts are fetched from the atom, and user specific
 * receipt information is fed into the child component.
 *
 * For transactions that haven't been confirmed yet, a skeleton is rendered.
 */
const ActivityView = () => {
    const user = useAtomValue(userAtom)
    const txs = useAtomValue(userTxsAtom)

    if (!user) return <UserNotFoundWarning />

    if (!txs.history.length && !txs.pending.length) {
        return <div className="w-full h-full p-2">No transactions to display.</div>
    }

    return (
        <div className="flex flex-col w-full max-h-4/5 overflow-y-auto p-2 space-y-1">
            {txs.pending.map((tx) => (
                <TxLoadingSkeleton key={`pending-tx-${tx.hash}`} tx={tx.hash} />
            ))}
            {txs.history.map((tx) => (
                <TxLogEntry key={`log-entry-${tx.receipt.transactionHash}`} tx={tx} />
            ))}
        </div>
    )
}

export default ActivityView
