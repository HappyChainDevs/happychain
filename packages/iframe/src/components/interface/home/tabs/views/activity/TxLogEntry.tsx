import { shortenAddress } from "@happychain/sdk-shared"
import { ArrowUpRight, CircleNotch } from "@phosphor-icons/react"
import clsx from "clsx"
import { formatEther } from "viem"
import { getCurrentChainBlockExplorerUrl } from "../../../../../../state/currentChain"
import type { ExtendedTransactionReceipt } from "../../../../../../state/txHistory"

interface TxLogEntryProps {
    tx: ExtendedTransactionReceipt
}

const TxLogEntry = ({ tx }: TxLogEntryProps) => {
    const blockExplorerUrl = getCurrentChainBlockExplorerUrl()

    return (
        <div className="flex flex-row items-center w-full justify-between px-3 py-4 border rounded-md border-slate-700">
            <div className="flex flex-row items-center justify-center space-x-1">
                <ArrowUpRight
                    className={clsx({
                        "bg-green-600 rounded-sm": tx.status === "success",
                        "bg-red-600 rounded-sm": tx.status === "reverted",
                    })}
                />
                <div className="flex flex-col items-start justify-center">
                    <span className="text-black">Send</span>
                    <span>
                        <a
                            href={`${blockExplorerUrl}/tx/${tx.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-purple-500 hover:underline"
                        >
                            {shortenAddress(tx.transactionHash)}
                        </a>
                    </span>
                </div>
            </div>

            <div>
                {tx.sendValue ? (
                    <span className="text-black font-semibold">{`-${formatEther(tx.sendValue)} HAPPY`}</span>
                ) : (
                    <div className="animate-spin">
                        <CircleNotch />
                    </div>
                )}
            </div>
        </div>
    )
}

export default TxLogEntry
