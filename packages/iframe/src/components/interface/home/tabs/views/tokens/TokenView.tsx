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
        <ul className="flex flex-col w-full max-h-4/5 overflow-y-auto bg-content rounded-xl gap-y-2">
            {userAssets?.length > 0 ? (
                userAssets.map((asset) => (
                    <li key={`${asset.options.address}-${user.uid}`}>
                        <WatchedAsset user={user} asset={asset} />
                    </li>
                ))
            ) : (
                <p className="text-base-content">No apps have added tokens to be tracked.</p>
            )}
        </ul>
    )
}

export default TokenView
