import { shortenAddress } from "@happychain/sdk-shared"
import { CircleNotch } from "@phosphor-icons/react"
import { useAtomValue } from "jotai"
import type { Hash } from "viem"
import { currentChainAtom } from "../../../../../../state/currentChain"

/**
 * Placeholder component to show loading status of a
 * transaction being confirmed in a block.
 */
interface TxLoadingSkeletonProps {
    tx: Hash
}
const TxLoadingSkeleton = ({ tx }: TxLoadingSkeletonProps) => {
    const currentChain = useAtomValue(currentChainAtom)
    const blockExplorerUrl = currentChain.blockExplorerUrls ? currentChain.blockExplorerUrls[0] : ""
    return (
        <div className="flex flex-row items-center w-full justify-between px-3 py-4 border rounded-md border-slate-700">
            <span>
                <a
                    href={`${blockExplorerUrl}/tx/${tx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-purple-500 hover:underline"
                >
                    {shortenAddress(tx)}
                </a>
            </span>

            <div className="animate-spin">
                <CircleNotch />
            </div>
        </div>
    )
}

export default TxLoadingSkeleton
