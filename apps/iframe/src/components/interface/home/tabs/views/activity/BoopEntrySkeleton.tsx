import { shortenAddress } from "@happy.tech/common"
import { CircleNotchIcon } from "@phosphor-icons/react"
import type { Hash } from "viem"

interface BoopEntrySkeletonProps {
    boopHash: Hash
}

/**
 * Placeholder component to show loading status of a
 * transaction being confirmed in a block.
 */
export const BoopEntrySkeleton = ({ boopHash }: BoopEntrySkeletonProps) => {
    const hash = shortenAddress(boopHash)

    return (
        <article className="focus-within:bg-primary/10 hover:bg-primary/5 p-2 rounded-md grid gap-1.5 relative">
            <div className="flex items-baseline text-xs gap-3">
                <div className="animate-spin size-5 flex items-center justify-center">
                    <CircleNotchIcon weight="bold" size="0.95em" />
                </div>
                <div className="font-medium text-base-content/80">Pending transaction</div>
                <div className="ms-auto font-semibold text-base-content/70 dark:text-base-content/50">{hash}</div>
            </div>
        </article>
    )
}
