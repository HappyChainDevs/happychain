import { shortenAddress } from "@happychain/sdk-shared"
import { ArrowUpRight } from "@phosphor-icons/react"
import clsx from "clsx"
import { formatEther } from "viem"

import { useAtomValue } from "jotai"
import { currentChainAtom } from "#src/state/chains"
import type { TxInfo } from "#src/state/txHistory"
import { useMemo } from "react"

interface TxLogEntryProps {
    tx: TxInfo
}

const TxLogEntry = ({ tx }: TxLogEntryProps) => {
    const currentChain = useAtomValue(currentChainAtom)
    const blockExplorerUrl = currentChain.blockExplorerUrls ? currentChain.blockExplorerUrls[0] : ""
    const { receipt, value } = tx

    const sentTxValue = useMemo(() => {
        return `-${formatEther(value)} HAPPY`
    }, [value])

    return (
        <div className="flex flex-row items-center w-full justify-between px-3 py-4 border rounded-md border-slate-700">
            <div className="flex flex-row items-center justify-center space-x-1">
                <ArrowUpRight
                    className={clsx({
                        "bg-green-600 rounded-sm": receipt.status === "success",
                        "bg-red-600 rounded-sm": receipt.status === "reverted",
                    })}
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
