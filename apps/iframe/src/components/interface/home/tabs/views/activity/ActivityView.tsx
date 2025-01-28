import { Swap } from "@phosphor-icons/react"
import { useAtomValue } from "jotai"
import { userAtom } from "#src/state/user"
import { userOpsAtom } from "#src/state/userOpsHistory.js"
import UserNotFoundWarning from "../UserNotFoundWarning"
import TxLoadingSkeleton from "./TxLoadingSkeleton"
import TxLogEntry from "./TxLogEntry"

/**
 * Displays HappyUser's recent 4337 transaction history.
 * TxReceipts are fetched from the atom, and user specific
 * receipt information is fed into the child component.
 *
 * For transactions that haven't been confirmed yet, a skeleton is rendered.
 */
const ActivityView = () => {
    const user = useAtomValue(userAtom)
    const userOps = useAtomValue(userOpsAtom)

    if (!user) return <UserNotFoundWarning />

    if (!userOps.confirmedOps?.length && !userOps.pendingOps?.length) {
        return <div className="size-full p-2">No transactions to display.</div>
    }

    return (
        <div className="flex flex-col w-full max-h-4/5 overflow-y-auto p-2 bg-base-200 rounded-lg space-y-1">
            {userOps.pendingOps.map((pendingOp) => (
                <TxLoadingSkeleton key={`op_pending_${pendingOp.userOpHash}`} tx={pendingOp.userOpHash} />
            ))}
            {userOps.confirmedOps.map((confirmedOp) => (
                <TxLogEntry key={`op_history_${confirmedOp.userOpReceipt.userOpHash}`} tx={confirmedOp} />
            ))}
        </div>
    )
}

export default ActivityView
