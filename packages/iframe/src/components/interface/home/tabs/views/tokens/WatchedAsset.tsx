import { Check, Trash, Warning, X } from "@phosphor-icons/react"
import { useMemo, useState } from "react"
import { useERC20Balance } from "#src/hooks/useERC20Balance"

import type { HappyUser } from "@happychain/sdk-shared"
import { type WatchAssetParametersForStorage, removeWatchedAsset } from "#src/state/watchedAssets"

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
    const [confirmRemoval, setConfirmRemoval] = useState(false)

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

    const handleRemoveClick = () => {
        if (confirmRemoval) {
            // in confirm state
            setConfirmRemoval(false)
            removeWatchedAsset(tokenAddress, userAddress)
        } else {
            setConfirmRemoval(true)
        }
    }

    const imageSource =
        asset.options.image && !isImageSourceBroken
            ? asset.options.image
            : `https://avatar.vercel.sh/${tokenAddress}?size=400`

    return (
        <div
            key={`watched-asset-${tokenAddress}`}
            className="inline-flex justify-between w-full min-h-10 px-2 max-w-full group relative overflow-hidden items-center gap-2 text-sm font-medium hover:bg-accent/10 focus-within:bg-accent/10"
        >
            <div className="flex flex-row w-1/2 gap-1 items-center min-w-0 max-w-[50%]">
                <img
                    alt={tokenAddress}
                    className="text-transparent rounded-full flex-shrink-0 size-4"
                    loading="lazy"
                    onError={() => setIsImageSourceBroken(true)}
                    src={imageSource}
                />
                <span
                    className="font-semibold text-sm whitespace-nowrap"
                    title={asset.options.symbol}
                >{`${confirmRemoval ? `Stop Tracking ${tokenSymbol}?` : `${tokenSymbol}`}`}</span>
            </div>

            <div className="flex flex-row items-center w-1/2 justify-end min-w-0">
                {!confirmRemoval ? (
                    <>
                        <span className="font-semibold text-sm group-hover:hidden group-focus-within:hidden truncate">
                            {`${
                                truncatedBalance ? (
                                    truncatedBalance
                                ) : (
                                    <>
                                        <span className="sr-only">Read Failure</span>
                                        <Warning size="1.5em" />
                                    </>
                                )
                            }`}
                        </span>
                        <button
                            type="button"
                            title={`Stop Tracking ${tokenSymbol}`}
                            className="hidden group-hover:block group-focus-within:block"
                            onClick={handleRemoveClick}
                        >
                            <span className="sr-only">Stop Tracking Token</span>
                            <Trash size="1.5em" />
                        </button>
                    </>
                ) : (
                    <div className="flex flex-row items-center justify-center gap-1">
                        <button type="button" onClick={handleRemoveClick}>
                            <span className="sr-only">Confirm removal</span>
                            <Check size="1.5em" />
                        </button>

                        <button type="button" onClick={() => setConfirmRemoval(false)}>
                            <span className="sr-only">Cancel removal</span>
                            <X size="1.5em" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default WatchedAsset
