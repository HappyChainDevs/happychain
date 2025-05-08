import { ClockIcon } from "@phosphor-icons/react"
import { useAtomValue } from "jotai"
import { historyAtom } from "#src/state/boopHistory"
import { userAtom } from "#src/state/user"
import UserNotFoundWarning from "../UserNotFoundWarning"
import { BoopEntry } from "./BoopEntry"
import BoopEntrySkeleton from "./BoopEntrySkeleton"

/**
 * Displays HappyUser's recent 4337 transaction history.
 * TxReceipts are fetched from the atom, and user specific
 * receipt information is fed into the child component.
 *
 * For transactions that haven't been confirmed yet, a skeleton is rendered.
 */
export const ActivityView = () => {
    const user = useAtomValue(userAtom)
    const boops = useAtomValue(historyAtom)

    if (!user) return <UserNotFoundWarning />

    if (!boops.length) {
        return (
            <div className="flex flex-col gap-3 items-center justify-center pt-6">
                <ClockIcon className="text-primary/70 dark:text-primary/70 text-4xl" weight="duotone" />
                <p className="text-xs italic text-base-content/70 dark:text-base-content/80">
                    No boops to display.
                </p>
            </div>
        )
    }

    return (
        <div className="grid gap-4">
            {boops.map((boop) =>
                boop.status ? (
                    <BoopEntry key={`boop_confirmed_${boop.boopHash}`} entry={boop} />
                ) : (
                    <BoopEntrySkeleton key={`boop_pending_${boop.boopHash}`} boopHash={boop.boopHash} />
                ),
            )}
        </div>
    )
}

export default ActivityView
