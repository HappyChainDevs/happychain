import { shortenAddress } from "@happy.tech/wallet-common"
import { CircleNotch } from "@phosphor-icons/react"
import { useAtomValue } from "jotai"
import type { Hash } from "viem"
import { currentChainAtom } from "#src/state/chains"

interface BoopEntrySkeletonProps {
    boopHash: Hash
}

/**
 * Placeholder component to show loading status of a
 * transaction being confirmed in a block.
 */
const BoopEntrySkeleton = ({ boopHash }: BoopEntrySkeletonProps) => {
    const currentChain = useAtomValue(currentChainAtom)
    const blockExplorerUrl = currentChain.blockExplorerUrls ? currentChain.blockExplorerUrls : ""
    const hash = shortenAddress(boopHash)

    return (
        <article className="focus-within:bg-primary/10 hover:bg-primary/5 p-2 rounded-md grid gap-1.5 relative">
            <div className="flex items-baseline text-xs gap-3">
                <div className="animate-spin size-5 flex items-center justify-center">
                    <CircleNotch weight="bold" size="0.95em" />
                </div>
                <div className="font-medium text-base-content/80">Pending transaction</div>
                <div className="ms-auto font-semibold text-base-content/70 dark:text-base-content/50">{hash}</div>
            </div>
            <a
                href={`${blockExplorerUrl}/op/${boopHash}`}
                target="_blank"
                rel="noopener noreferrer"
                title="View on explorer"
                className="absolute size-full inset opacity-0"
            >
                {hash}
            </a>
        </article>
    )
}

export default BoopEntrySkeleton
