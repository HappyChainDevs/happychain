import { Warning } from "@phosphor-icons/react"
import { useMemo, useState } from "react"
import { useERC20Balance } from "#src/hooks/useERC20Balance"

import type { HappyUser } from "@happychain/sdk-shared"
import type { WatchAssetParametersForStorage } from "#src/state/watchedAssets"
import { RemoveTokenMenu } from "./RemoveTokenMenu"

interface WatchedAssetProps {
    user: HappyUser
    asset: WatchAssetParametersForStorage
}

/**
 * Component to display watched assets added by the user (ERC20).
 * Token balance is fetched using the {@link useERC20Balance} hook.
 *
 * User has the option to stop watching an asset, which updates
 * the local storage entry.
 */
const WatchedAsset = ({ user, asset }: WatchedAssetProps) => {
    const userAddress = user.address
    const tokenAddress = asset.options.address

    const [isImageSourceBroken, setIsImageSourceBroken] = useState(false)

    const { data: balanceData } = useERC20Balance(tokenAddress, userAddress)

    // shortened fields for UI visibility
    const tokenSymbol = useMemo(
        () => (asset.options.symbol.length > 7 ? `${asset.options.symbol.slice(0, 7)}\u2026` : asset.options.symbol),
        [asset],
    )
    const truncatedBalance = useMemo(
        () => balanceData?.formatted && `${Number(balanceData.formatted).toFixed(4)}`,
        [balanceData?.formatted],
    )

    const imageSource =
        asset.options.image && !isImageSourceBroken
            ? asset.options.image
            : `https://avatar.vercel.sh/${tokenAddress}?size=400`

    return (
        <div
            key={`watched-asset-${tokenAddress}`}
            className="rounded-xl inline-flex justify-between w-full min-h-10 max-w-full group overflow-x-hidden items-center gap-2 text-sm font-medium hover:bg-accent/10 group-focus-within:bg-accent/10"
        >
            <div className="flex flex-row w-1/2 gap-1 items-center min-w-0 max-w-[50%] px-1">
                <img
                    alt={tokenAddress}
                    className="text-transparent rounded-full flex-shrink-0 size-4"
                    loading="lazy"
                    onError={() => setIsImageSourceBroken(true)}
                    src={imageSource}
                />
                <span className="font-semibold text-sm whitespace-nowrap" title={asset.options.symbol}>
                    {tokenSymbol}
                </span>
            </div>

            <div className="flex flex-row items-center w-1/2 justify-end min-w-0">
                {truncatedBalance ? (
                    <span className="font-semibold text-sm truncate">{truncatedBalance}</span>
                ) : (
                    <span className="flex items-center gap-1 ml-2">
                        <span className="sr-only">Read Failure</span>
                        <Warning size="1em" />
                    </span>
                )}
                <RemoveTokenMenu tokenAddress={tokenAddress} userAddress={userAddress} />
            </div>
        </div>
    )
}

export default WatchedAsset
