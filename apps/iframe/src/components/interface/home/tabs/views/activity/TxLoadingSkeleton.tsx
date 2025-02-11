import { shortenAddress } from "@happy.tech/wallet-common"
import { CircleNotch } from "@phosphor-icons/react"
import { useAtomValue } from "jotai"
import type { Hash } from "viem"
import { currentChainAtom } from "#src/state/chains"

interface TxLoadingSkeletonProps {
    tx: Hash
}

/**
 * Placeholder component to show loading status of a
 * transaction being confirmed in a block.
 */
const TxLoadingSkeleton = ({ tx }: TxLoadingSkeletonProps) => {
    const currentChain = useAtomValue(currentChainAtom)
    const blockExplorerUrl = currentChain.blockExplorerUrls ? currentChain.blockExplorerUrls : ""

    return (
        <article className="focus-within:bg-primary/10 hover:bg-primary/5 p-2 rounded-md grid gap-1.5 relative">
            <div className="flex items-baseline text-xs gap-3">
                <div className="animate-spin size-5 flex items-center justify-center">
                    <CircleNotch weight="bold" size="0.95em" />
                </div>
                <h1 className="font-medium text-base-content/80">Pending transaction</h1>
                <div className="ms-auto font-semibold text-base-content/70 dark:text-base-content/50">
                    {shortenAddress(tx)}
                </div>
            </div>
            <a
                href={`${blockExplorerUrl}/op/${tx}`}
                target="_blank"
                rel="noopener noreferrer"
                title="View on explorer"
                className="absolute size-full z-10 inset opacity-0"
            >
                {shortenAddress(tx)}
            </a>
        </article>
    )
}

export default TxLoadingSkeleton
