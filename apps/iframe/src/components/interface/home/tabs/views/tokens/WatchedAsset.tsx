import type { Address } from "@happy.tech/common"
import type { HappyUser } from "@happy.tech/wallet-common"
import { useAtom } from "jotai"
import { useEffect, useMemo, useState } from "react"
import type { WatchAssetParameters } from "viem"
import { useERC20Balance } from "#src/hooks/useERC20Balance"
import { walletOpenSignalAtom } from "#src/state/interfaceState.ts"
import { BalanceDisplay } from "./BalanceDisplay"
import { RemoveTokenMenu } from "./RemoveTokenMenu"

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
export const WatchedAsset = ({ user, asset }: WatchedAssetProps) => {
    const userAddress = user.address
    const tokenAddress = asset.options.address

    const [isImageSourceBroken, setIsImageSourceBroken] = useState(false)
    const [walletOpenSignal, setWalletOpenSignal] = useAtom(walletOpenSignalAtom)

    const { data: balanceData, isLoading, refetch } = useERC20Balance(tokenAddress as Address, userAddress)

    // shortened fields for UI visibility
    const tokenSymbol = useMemo(
        () => (asset.options.symbol.length > 7 ? `${asset.options.symbol.slice(0, 7)}\u2026` : asset.options.symbol),
        [asset],
    )

    const truncatedBalance = useMemo(() => {
        // here, we check with `value` since that's the fetched onchain data;
        // we return `formatted` since that's intended for use within the UI
        // in the BalanceDisplay component (using `value`)
        if (balanceData?.value === undefined) return

        return new Intl.NumberFormat(navigator.language, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
        }).format(Number(balanceData.formatted))
    }, [balanceData])

    // refetch on wallet open
    useEffect(() => {
        if (!walletOpenSignal) return
        // NOTE: This is potentially racy with other users of the wallet open signal, but since fetching has high
        // latency for all current uses, should be fine, for now.
        void refetch().then(() => setWalletOpenSignal(false))
    }, [refetch, walletOpenSignal, setWalletOpenSignal])

    // biome-ignore lint/correctness/useExhaustiveDependencies: refetch on mount
    useEffect(() => {
        if (isLoading) return
        void refetch()
    }, [])

    const imageSource =
        asset.options.image && !isImageSourceBroken
            ? asset.options.image
            : `https://avatar.vercel.sh/${tokenAddress}?size=120`

    return (
        <div
            key={`watched-asset-${tokenAddress}`}
            className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 min-h-10 p-2 text-sm font-medium"
        >
            <img
                alt={tokenAddress}
                className="text-transparent rounded-full flex-shrink-0 size-4"
                loading="lazy"
                onError={() => setIsImageSourceBroken(true)}
                src={imageSource}
            />

            <span className="font-semibold text-sm truncate" title={asset.options.symbol}>
                {tokenSymbol}
            </span>

            <BalanceDisplay isLoading={isLoading} balance={truncatedBalance} />
            <RemoveTokenMenu token={tokenAddress as Address} />
        </div>
    )
}
