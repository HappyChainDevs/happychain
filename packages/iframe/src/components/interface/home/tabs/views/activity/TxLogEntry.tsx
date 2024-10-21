import { happyChainSepolia, shortenAddress } from "@happychain/sdk-shared"
import { ArrowUpRight, CircleNotch } from "@phosphor-icons/react"
import clsx from "clsx"
import { formatEther, hexToBigInt } from "viem"
import type { ExtendedTransactionReceipt } from "../../../../../../state/txHistory"

interface TxLogEntryProps {
    tx: ExtendedTransactionReceipt
}

const TxLogEntry = ({ tx }: TxLogEntryProps) => {
    return (
        <div className="flex flex-row items-center w-[90%] justify-between px-3 py-4 border rounded-md border-slate-700">
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
                            href={`${happyChainSepolia.blockExplorerUrls[0]}/tx/${tx.transactionHash}`}
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
                    <span className="text-black">{`- ${formatEther(hexToBigInt(tx.sendValue as `0x${string}`))} $HAPPY`}</span>
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
