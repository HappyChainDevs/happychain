import { useAtomValue } from "jotai"
import { useMemo } from "react"
import type { WatchAssetParameters } from "viem"
import { userAtom } from "#src/state/user"
import { watchedAssetsAtom } from "#src/state/watchedAssets"

export function useWatchedAssets({
    type = "ERC20",
}: {
    type?: string
}) {
    const user = useAtomValue(userAtom)
    const watchedAssets = useAtomValue(watchedAssetsAtom)
    const userAssets = useMemo(() => {
        if (!user?.address) return [] as Array<WatchAssetParameters>
        const tokens = watchedAssets[user.address] || []
        return tokens.filter((asset) => asset.type === type) as Array<WatchAssetParameters>
    }, [user, watchedAssets, type])

    return userAssets
}
