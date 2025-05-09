import { ClockIcon, RowsIcon } from "@phosphor-icons/react"
import { useAtomValue } from "jotai"
import { historyAtom } from "#src/state/boopHistory"
import { getCurrentChain } from "#src/state/chains"
import { userAtom } from "#src/state/user"
import UserNotFoundWarning from "../UserNotFoundWarning"
import { BoopEntry } from "./BoopEntry"
import BoopEntrySkeleton from "./BoopEntrySkeleton"

/**
 * Displays HappyUser's recent 4337 transaction history.
 * For transactions that haven't been confirmed yet, a skeleton is rendered.
 * At most 50 of the most recent userOps are displayed, after that we ask the
 * user to check the explorer for their entire userOp history.
 */
export const ActivityView = () => {
    const user = useAtomValue(userAtom)
    const history = useAtomValue(historyAtom)
    const currentChain = getCurrentChain()
    const blockExplorerUrl = currentChain.blockExplorerUrls?.[0] ?? ""

    if (!user) return <UserNotFoundWarning />

    if (!history.length) {
        return (
            <div className="flex flex-col gap-3 items-center justify-center pt-6">
                <ClockIcon className="text-primary/70 dark:text-primary/70 text-4xl" weight="duotone" />
                <p className="text-xs italic text-base-content/70 dark:text-base-content/80">No boops to display.</p>
            </div>
        )
    }
    const settledHistory = history.filter((boop) => !!boop.status)

    return (
        <div className="grid gap-4">
            {history.map((boop) =>
                boop.status ? (
                    <BoopEntry key={`boop_confirmed_${boop.boopHash}`} entry={boop} />
                ) : (
                    <BoopEntrySkeleton key={`boop_pending_${boop.boopHash}`} boopHash={boop.boopHash} />
                ),
            )}

            {settledHistory.length >= 50 && (
                <div className="flex flex-row items-center justify-center text-xs gap-1">
                    <RowsIcon size={"1.15em"} className="text-primary/70 dark:text-primary/70" />
                    <a
                        href={`${blockExplorerUrl}/address/${user.address}`}
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
