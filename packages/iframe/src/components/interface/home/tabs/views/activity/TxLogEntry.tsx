import { happyChainSepolia, shortenAddress } from "@happychain/sdk-shared"
import { ArrowUpRight, CircleNotch } from "@phosphor-icons/react"
import type { TransactionReceipt } from "viem"

interface TxLogEntryProps {
    tx: TransactionReceipt
}

/**
 * Used to present details based on tx receipt from user's activity.
 */
const TxLogEntry = ({ tx }: TxLogEntryProps) => {
    return (
        <div className="flex flex-row items-center w-[90%] justify-between px-3 py-4 border rounded-md border-slate-700">
            <div className="flex flex-row items-center justify-center space-x-1">
                <ArrowUpRight className="bg-green-600 rounded-sm" />
                <span>
                    <a
                        href={`${happyChainSepolia.blockExplorerUrls[0]}/tx/${tx.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-purple-500 hover:underline"
                    >
                        {shortenAddress(tx.transactionHash)}
                    </a>
                </span>
            </div>
            <div>
                {tx?.status !== undefined ? (
                    tx.status === "success" ? (
                        <div className="tooltip" data-tip={"Tx Successful"}>
                            <span>✅</span>
                        </div>
                    ) : (
                        <div className="tooltip" data-tip={"Tx Reverted"}>
                            <span>❌</span>
                        </div>
                    )
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
