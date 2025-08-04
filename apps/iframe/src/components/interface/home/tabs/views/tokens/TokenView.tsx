import { observer } from "@legendapp/state/react"
import { CoinsIcon } from "@phosphor-icons/react"
import { useAtomValue } from "jotai"
import { userAtom } from "#src/state/user"
import { getWatchedAssets } from "#src/state/watchedAssets"
import { UserNotFoundWarning } from "../UserNotFoundWarning"
import { TriggerImportTokensDialog } from "./ImportTokensDialog"
import { WatchedAsset } from "./WatchedAsset"

/**
 * Displays all watched assets registered by the connected user.
 */
export const TokenView = observer(() => {
    const user = useAtomValue(userAtom)
    const userAssets = getWatchedAssets()

    if (!user) return <UserNotFoundWarning />

    return (
        <ul className="flex flex-col w-full bg-content min-h-full gap-y-2">
            {userAssets?.length > 0 ? (
                userAssets.map((asset) => (
                    <li className="relative" key={`${asset.options.address}-${user.uid}`}>
                        <WatchedAsset user={user} asset={asset} />
                    </li>
                ))
            ) : (
                <div className="flex flex-col gap-3 items-center justify-center pt-6">
                    <CoinsIcon className="text-primary/70 dark:text-primary/70 text-4xl" weight="duotone" />
                    <p className="text-xs italic text-base-content/70 dark:text-base-content/80">
                        Your watched tokens will appear here.
                    </p>
                </div>
            )}
            <TriggerImportTokensDialog />
        </ul>
    )
})
