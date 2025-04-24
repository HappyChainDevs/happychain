import { Clock } from "@phosphor-icons/react"
import { useAtomValue } from "jotai"
import { userAtom } from "#src/state/user"
import { UserOpStatus, userOpsAtom } from "#src/state/userOpsHistory"
import UserNotFoundWarning from "../UserNotFoundWarning"
import TxLoadingSkeleton from "./TxLoadingSkeleton"
import { TxLogEntry } from "./TxLogEntry"

/**
 * Displays HappyUser's recent 4337 transaction history.
 * TxReceipts are fetched from the atom, and user specific
 * receipt information is fed into the child component.
 *
 * For transactions that haven't been confirmed yet, a skeleton is rendered.
 */
export const ActivityView = () => {
    const user = useAtomValue(userAtom)
    const userOps = useAtomValue(userOpsAtom)

    if (!user) return <UserNotFoundWarning />

    if (!userOps.length) {
        return (
            <div className="flex flex-col gap-3 items-center justify-center pt-6">
                <Clock className="text-primary/70 dark:text-primary/70 text-4xl" weight="duotone" />
                <p className="text-xs italic text-base-content/70 dark:text-base-content/80">
                    No transactions to display.
                </p>
            </div>
        )
    }

    return (
        <div className="grid gap-4">
            {userOps.map((op) =>
                op.status === UserOpStatus.Pending ? (
                    <TxLoadingSkeleton key={`op_pending_${op.userOpHash}`} tx={op.userOpHash} />
                ) : (
                    <TxLogEntry key={`op_confirmed_${op.userOpHash}`} tx={op} />
                ),
            )}
        </div>
    )
}

export default ActivityView
