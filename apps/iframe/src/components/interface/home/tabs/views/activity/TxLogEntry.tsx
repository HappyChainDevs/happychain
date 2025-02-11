import { shortenAddress } from "@happy.tech/wallet-common"
import { ArrowUp, Lightning, LightningSlash, PencilSimple } from "@phosphor-icons/react"
import { useAtomValue } from "jotai"
import { formatEther, formatUnits } from "viem"
import { currentChainAtom } from "#src/state/chains"
import type { UserOpInfo } from "#src/state/userOpsHistory"
import { OperationType, useClassifyActivity } from "./useClassifyActivity"

const ACTIVITY_HEADLINE = {
    [OperationType.NativeTransfer]: {
        label: "Send HAPPY",
        icon: ArrowUp,
    },
    [OperationType.ERC20Transfer]: {
        label: (symbol?: string) => `Send ${symbol ?? "ERC20 token"}`,
        icon: ArrowUp,
    },
    [OperationType.ContractInteraction]: {
        label: "Contract interaction",
        icon: PencilSimple,
    },
    [OperationType.SessionKeyAdded]: {
        label: "Session key created",
        icon: Lightning,
    },
    [OperationType.SessionKeyRemoved]: {
        label: "Session key removed",
        icon: LightningSlash,
    },
}

interface TxLogEntryProps {
    tx: UserOpInfo
}

export const TxLogEntry = ({ tx }: TxLogEntryProps) => {
    const { details, type } = useClassifyActivity(tx)
    const currentChain = useAtomValue(currentChainAtom)
    const blockExplorerUrl = currentChain.blockExplorerUrls ? currentChain.blockExplorerUrls[0] : ""
    const { userOpReceipt, value: sendValue } = tx
    const Icon = ACTIVITY_HEADLINE[type].icon

    return (
        <article className="focus-within:bg-primary/10 hover:bg-primary/5 p-2 rounded-md grid gap-1 relative">
            <div className="flex items-baseline text-xs gap-3">
                <div
                    className={`${tx.userOpReceipt.success ? "text-primary dark:text-primary/50" : "text-error dark:text-error/50"} bg-base-content/5 dark:bg-base-content/20 p-1 aspect-square rounded-full flex items-center justify-center`}
                >
                    <Icon weight="bold" size="0.95em" />
                </div>
                <h1 className="font-medium text-base-content/80">
                    {type !== OperationType.ERC20Transfer
                        ? ACTIVITY_HEADLINE[type].label
                        : ACTIVITY_HEADLINE[type].label(details?.symbol)}
                </h1>

                <div className="ms-auto font-semibold text-base-content/70 dark:text-base-content/50">
                    {shortenAddress(userOpReceipt.userOpHash)}
                </div>
            </div>
            {type === OperationType.NativeTransfer && sendValue !== 0n && (
                <p className="flex px-0.5 gap-[0.75ex] items-baseline">
                    <span className="font-bold block overflow-hidden truncate max-w-[30ch]">
                        - {formatEther(sendValue)}
                    </span>{" "}
                    <span className="text-xs block font-semibold">HAPPY</span>
                </p>
            )}
            {Boolean(
                type === OperationType.ERC20Transfer && details?.amount && details?.decimals && details?.symbol,
            ) && (
                <p className="flex px-0.5 gap-[0.75ex] items-baseline">
                    <span className="font-bold block overflow-hidden truncate max-w-[30ch]">
                        - {formatUnits(details!.amount as bigint, details!.decimals as number)}
                    </span>{" "}
                    <span className="text-xs block font-semibold">{details?.symbol}</span>
                </p>
            )}
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
