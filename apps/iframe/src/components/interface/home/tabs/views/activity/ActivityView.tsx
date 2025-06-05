import { ClockIcon, RowsIcon } from "@phosphor-icons/react"
import { useAtomValue } from "jotai"
import { historyAtom } from "#src/state/boopHistory"
import { getCurrentChain } from "#src/state/chains"
import { userAtom } from "#src/state/user"
import UserNotFoundWarning from "../UserNotFoundWarning"
import { BoopEntry } from "./BoopEntry"
import BoopEntrySkeleton from "./BoopEntrySkeleton"

/**
 * Displays the user's transaction (boop) history. We show a spinner for pending transactions. At most 50
 * transactions are saved in the history and displayed, if we're at the max, we show an explorer link for more.
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
                <p className="text-xs italic text-base-content/70 dark:text-base-content/80">
                    No transactions to display.
                </p>
            </div>
        )
    }

    return (
        <div className="grid gap-4">
            {history.map((boop) =>
                boop.status ? (
                    <BoopEntry key={`boop_confirmed_${boop.boopHash}`} entry={boop} />
                ) : (
                    <BoopEntrySkeleton key={`boop_pending_${boop.boopHash}`} boopHash={boop.boopHash} />
                ),
            )}

            {/* In theory, can't be > 50, but it never hurts to be safe. */}
            {history.length >= 50 && (
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
