import { Coins } from "@phosphor-icons/react"
import { useAtomValue } from "jotai"
import { userAtom } from "#src/state/user"
import { watchedAssetsAtom } from "#src/state/watchedAssets"
import UserNotFoundWarning from "../UserNotFoundWarning"
import WatchedAsset from "./WatchedAsset"

/**
 * Displays all watched assets registered by the connected user.
 */
const TokenView = () => {
    const user = useAtomValue(userAtom)
    const watchedAssets = useAtomValue(watchedAssetsAtom)

    if (!user) return <UserNotFoundWarning />
    const userAssets = watchedAssets[user.address]

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
                    <Coins className="text-primary/70 dark:text-primary/70 text-4xl" weight="duotone" />
                    <p className="text-xs italic text-base-content/70 dark:text-base-content/80">
                        Your watched tokens will appear here.
                    </p>
                </div>
            )}
        </ul>
    )
}

export default TokenView
