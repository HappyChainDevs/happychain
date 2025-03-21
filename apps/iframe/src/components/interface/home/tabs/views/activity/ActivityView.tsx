import { Clock, Rows } from "@phosphor-icons/react"
import { useAtomValue } from "jotai"
import { getCurrentChain } from "#src/state/chains.ts"
import { userAtom } from "#src/state/user"
import { UserOpStatus, userOpsAtom } from "#src/state/userOpsHistory"
import UserNotFoundWarning from "../UserNotFoundWarning"
import TxLoadingSkeleton from "./TxLoadingSkeleton"
import { TxLogEntry } from "./TxLogEntry"

/**
 * Displays HappyUser's recent 4337 transaction history.
 * For transactions that haven't been confirmed yet, a skeleton is rendered.
 * At most 50 of the most recent userOps are displayed, after that we ask the
 * user to check the explorer for their entire userOp history.
 */
export const ActivityView = () => {
    const user = useAtomValue(userAtom)
    const userOps = useAtomValue(userOpsAtom)
    const currentChain = getCurrentChain()
    const blockExplorerUrl = currentChain.blockExplorerUrls ?? ""

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
    const nonPendingUserOps = userOps.filter((op) => op.status !== UserOpStatus.Pending)

    return (
        <div className="grid gap-4">
            {userOps.map((op) =>
                op.status === UserOpStatus.Pending ? (
                    <TxLoadingSkeleton key={`op_pending_${op.userOpHash}`} tx={op.userOpHash} />
                ) : (
                    <TxLogEntry key={`op_confirmed_${op.userOpHash}`} tx={op} />
                ),
            )}
            {nonPendingUserOps.length >= 50 && (
                <div className="flex flex-row items-center justify-center text-xs gap-1">
                    <Rows size={"1.15em"} className="text-primary/70 dark:text-primary/70" />
                    <a
                        href={`${blockExplorerUrl}/address/${user.address}?tab=user_ops`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View more on explorer"
                        className="text-xs italic text-base-content/70 dark:text-base-content/80 hover:underline"
                    >
                        View more on explorer
                    </a>
                </div>
            )}
        </div>
    )
}

export default ActivityView
