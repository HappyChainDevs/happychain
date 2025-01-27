import { shortenAddress } from "@happychain/sdk-shared"
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
        <div className="flex flex-col items-start w-full justify-between px-3 py-4 border rounded-md border-slate-700">
            <div className="flex flex-row w-full items-center justify-between">
                <span>
                    <a
                        href={`${blockExplorerUrl}/tx/${tx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/50 hover:underline"
                    >
                        {shortenAddress(tx)}
                    </a>
                </span>

                <div className="animate-spin">
                    <CircleNotch />
                </div>
            </div>

            <span className="text-[12px] text-warning hover:text-warning/80 hover:underline px-2 py-1 bg-warning/40 rounded-lg">
                Pending
            </span>
        </div>
    )
}

export default TxLoadingSkeleton
