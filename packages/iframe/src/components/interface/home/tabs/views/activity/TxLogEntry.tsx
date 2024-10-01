import { happyChainSepolia, shortenAddress } from "@happychain/sdk-shared"
import { CircleNotch } from "@phosphor-icons/react"
import type { Hash } from "viem"
import { useExtractReceipts } from "../../../../../../hooks/useExtractReceipts"

interface TxLogEntryProps {
    tx: Hash
}

/**
 * Retrieves and presents details based on receipt of tx.
 */
const TxLogEntry = ({ tx }: TxLogEntryProps) => {
    const receipt = useExtractReceipts(tx)
    return (
        <div className="flex flex-row items-center w-full justify-between p-2">
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
            <div>
                {receipt?.status !== undefined ? (
                    receipt.status === "success" ? (
                        <span>✅</span> // Success
                    ) : (
                        <span>❌</span> // Failure
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
