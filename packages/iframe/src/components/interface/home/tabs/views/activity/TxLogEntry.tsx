import { shortenAddress } from "@happychain/sdk-shared"
import { ArrowUpRight } from "@phosphor-icons/react"
import { formatEther } from "viem"

import { cx } from "class-variance-authority"
import { useAtomValue } from "jotai"
import { currentChainAtom } from "#src/state/chains"
import type { TxInfo } from "#src/state/txHistory"

interface TxLogEntryProps {
    tx: TxInfo
}

const TxLogEntry = ({ tx }: TxLogEntryProps) => {
    const currentChain = useAtomValue(currentChainAtom)
    const blockExplorerUrl = currentChain.blockExplorerUrls ? currentChain.blockExplorerUrls[0] : ""
    const { receipt, value } = tx

    const sentTxValue = `-${formatEther(value)} HAPPY`

    return (
        <div className="flex flex-row items-center w-full justify-between px-3 py-4 border rounded-md border-slate-700">
            <div className="flex flex-row items-center justify-center space-x-1">
                <ArrowUpRight
                    className={`${cx({
                        "bg-success": receipt.status === "success",
                        "bg-error": receipt.status === "reverted",
                    })} rounded-sm`}
                />
                <div className="flex flex-col items-start justify-center">
                    <span>Send</span>
                    <span>
                        <a
                            href={`${blockExplorerUrl}/tx/${receipt.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-purple-500 hover:underline"
                        >
                            {shortenAddress(receipt.transactionHash)}
                        </a>
                    </span>
                </div>
            </div>

            <span className="font-semibold">{sentTxValue}</span>
        </div>
    )
}

export default TxLogEntry
