import { type WatchAssetParameters, isAddress, zeroAddress } from "viem"

import { Check, Trash, X } from "@phosphor-icons/react"
import { useMemo, useState } from "react"
import { useERC20Balance } from "#src/hooks/useERC20Balance.js"

import type { HappyUser } from "@happychain/sdk-shared"
import { removeWatchedAsset } from "#src/state/watchedAssets.js"

interface WatchedAssetProps {
    user: HappyUser
    asset: WatchAssetParameters
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
    const tokenAddress = isAddress(asset.options.address) ? asset.options.address : zeroAddress // using zeroAddr ensures no data gets returned

    const [isImageSourceBroken, setIsImageSourceBroken] = useState(false)
    const [confirmRemoval, setConfirmRemoval] = useState(false)

    const { data: balanceData } = useERC20Balance(tokenAddress, userAddress)

    // shortened fields for UI visibility
    const tokenSymbol = useMemo(() => asset.options.symbol.substring(0, 4), [asset])
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
            className="inline-flex justify-between w-full p-2 min-h-10 max-w-full group relative overflow-hidden items-center gap-2 text-sm font-medium hover:bg-accent/10 focus-within:bg-accent/10"
        >
            <div className="flex flex-row w-1/2 gap-1 items-center min-w-0 max-w-[50%]">
                <img
                    alt={tokenAddress}
                    className="text-transparent rounded-full flex-shrink-0 size-4"
                    loading="lazy"
                    onError={() => setIsImageSourceBroken(true)}
                    src={imageSource}
                />
                <span className="font-semibold text-sm truncate">{`${confirmRemoval ? `Hide ${tokenSymbol}?` : `${tokenSymbol}`}`}</span>
            </div>

            <div className="flex flex-row items-center w-1/2 justify-end min-w-0">
                {!confirmRemoval ? (
                    <>
                        <span className="font-semibold text-sm group-hover:hidden group-focus-within:hidden truncate">
                            {`${truncatedBalance}`}
                        </span>
                        <button
                            type="button"
                            title={`Remove ${tokenSymbol}`}
                            className="hidden group-hover:block group-focus-within:block"
                            onClick={handleRemoveClick}
                        >
                            <span className="sr-only">Remove token</span>
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
