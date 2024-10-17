import { happyChainSepolia, shortenAddress } from "@happychain/sdk-shared"
import { CircleNotch } from "@phosphor-icons/react"
import type { Hash } from "viem"

/**
 * Placeholder component to show loading status of
 * transaction being confirmed in a block.
 */
interface TxLoadingSkeletonProps {
    tx: Hash
}
const TxLoadingSkeleton = ({ tx }: TxLoadingSkeletonProps) => {
    return (
        <div className="flex flex-row items-center w-full justify-between px-3 py-4 border rounded-md border-slate-700">
            <span>
                <a
                    href={`${happyChainSepolia.blockExplorerUrls[0]}/tx/${tx}`}
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
