import { Onchain } from "@happy.tech/boop-sdk"
import { shortenAddress } from "@happy.tech/wallet-common"
import { ArrowUp, Lightning, LightningSlash, PencilSimple, WarningOctagon } from "@phosphor-icons/react"
import { useAtomValue } from "jotai"
import { formatEther, formatUnits } from "viem"
import { BoopStatus, type StoredBoop } from "#src/state/boopHistory"
import { currentChainAtom } from "#src/state/chains"
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
        label: "Session key(s) removed",
        icon: LightningSlash,
    },
    [OperationType.Failed]: {
        label: "Failed",
        icon: WarningOctagon,
    },
}

interface BoopEntryProps {
    boop: StoredBoop
}

export const BoopEntry = ({ boop }: BoopEntryProps) => {
    const { details, type } = useClassifyActivity(boop)

    const currentChain = useAtomValue(currentChainAtom)
    const blockExplorerUrl = currentChain.blockExplorerUrls ? currentChain.blockExplorerUrls[0] : ""
    const { value, boopHash, status } = boop
    const Icon = ACTIVITY_HEADLINE[type].icon
    const shortHash = shortenAddress(boopHash)

    return (
        <article className="focus-within:bg-primary/10 hover:bg-primary/5 p-2 rounded-md grid gap-1 relative">
            <div className="flex items-baseline text-xs gap-3">
                <div
                    className={`${status === BoopStatus.Success ? "text-primary dark:text-primary/50" : "text-error dark:text-error/50"} bg-base-content/5 dark:bg-base-content/20 p-1 aspect-square rounded-full flex items-center justify-center`}
                >
                    <Icon weight="bold" size="0.95em" />
                </div>
                <h1 className="font-medium text-base-content/80">
                    {type !== OperationType.ERC20Transfer
                        ? ACTIVITY_HEADLINE[type].label
                        : ACTIVITY_HEADLINE[type].label(details?.symbol)}
                </h1>

                <div className="ms-auto font-semibold text-base-content/70 dark:text-base-content/50">{shortHash}</div>
            </div>
            {type === OperationType.NativeTransfer && value !== 0n && (
                <p className="flex px-0.5 gap-[0.75ex] items-baseline">
                    <span className="font-bold block overflow-hidden truncate max-w-[30ch]">
                        - {formatEther(value)}
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
            {boop.boopReceipt?.status === Onchain.Success && (
                <a
                    href={`${blockExplorerUrl}/tx/${boop.boopReceipt.receipt.txReceipt.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View on explorer"
                    className="absolute size-full inset opacity-0"
                >
                    {shortHash}
                </a>
            )}
        </article>
    )
}
