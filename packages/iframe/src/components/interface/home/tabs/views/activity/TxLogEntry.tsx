import { PaperPlaneRight } from "@phosphor-icons/react"
import { formatEther } from "viem"

import { cx } from "class-variance-authority"
import { useAtomValue } from "jotai"
import { currentChainAtom } from "#src/state/chains"
import type { UserOpInfo } from "#src/state/userOpsHistory"

interface TxLogEntryProps {
    tx: UserOpInfo
}

const TxLogEntry = ({ tx }: TxLogEntryProps) => {
    const currentChain = useAtomValue(currentChainAtom)
    const blockExplorerUrl = currentChain.blockExplorerUrls ? currentChain.blockExplorerUrls[0] : ""
    const { userOpReceipt, value: sendValue } = tx

    const sentTxValue = `-${formatEther(sendValue)} HAPPY`

    return (
        <div className="flex flex-row items-center w-full justify-between px-3 py-4 border rounded-md border-primary-content bg-base-200">
            <div className="flex flex-row items-center justify-center gap-x-2">
                <div className={cx("p-2 rounded-full", userOpReceipt.success ? "bg-success/60" : "bg-error/60")}>
                    <PaperPlaneRight className="size-4" />
                </div>
                <div className="flex flex-col items-start justify-center">
                    <p className="font-light">Sent</p>
                    <span>
                        <a
                            href={`${blockExplorerUrl}/op/${userOpReceipt.userOpHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] text-primary hover:text-primary/60 hover:underline px-2 py-1 bg-primary/20 rounded-lg"
                        >
                            View on Explorer
                        </a>
                    </span>
                </div>
            </div>

            <span className="font-light">{sentTxValue}</span>
        </div>
    )
}

export default TxLogEntry
