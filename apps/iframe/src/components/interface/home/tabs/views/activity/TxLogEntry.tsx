import { shortenAddress } from "@happy.tech/wallet-common"
import { ArrowUp } from "@phosphor-icons/react"
import { useAtomValue } from "jotai"
import { formatEther } from "viem"
import { currentChainAtom } from "#src/state/chains"
import type { UserOpInfo } from "#src/state/userOpsHistory"

interface TxLogEntryProps {
    tx: UserOpInfo
}

export const TxLogEntry = ({ tx }: TxLogEntryProps) => {
    const currentChain = useAtomValue(currentChainAtom)
    const blockExplorerUrl = currentChain.blockExplorerUrls ? currentChain.blockExplorerUrls[0] : ""
    const { userOpReceipt, value: sendValue } = tx

    return (
        <article className="focus-within:bg-primary/10 hover:bg-primary/5 p-2 rounded-md grid gap-1 relative">
            <div className="flex items-center text-xs gap-[1ex]">
                <div
                    className={`${userOpReceipt.success ? "text-success dark:text-success/50" : "text-error dark:text-error/50"} bg-base-content/5 dark:bg-base-content/20 p-1 aspect-square rounded-full flex items-center justify-center`}
                >
                    <ArrowUp weight="bold" size="0.795em" />
                </div>
                <h1 className="font-medium text-base-content/80">Contract interaction</h1>
                <div className="ms-auto font-semibold text-base-content/70 dark:text-base-content/50">
                    {shortenAddress(userOpReceipt.userOpHash)}
                </div>
            </div>
            <p className="flex px-0.5 gap-[0.75ex] items-baseline">
                <span className="font-bold block overflow-hidden truncate max-w-[30ch]">
                    - {formatEther(sendValue)}
                </span>{" "}
                <span className="text-xs block font-semibold">HAPPY</span>
            </p>

            <a
                href={`${blockExplorerUrl}/op/${userOpReceipt.userOpHash}`}
                target="_blank"
                rel="noopener noreferrer"
                title="View on explorer"
                className="absolute size-full z-10 inset opacity-0"
            >
                {shortenAddress(userOpReceipt.userOpHash)}
            </a>
        </article>
    )
}
