import type { Hex, TransactionReceipt } from "viem"
import { publicClient } from "#lib/clients"
import { happyTransactionService } from "#lib/services"
import type { HappyTxReceipt } from "#lib/tmp/interface/HappyTxReceipt"
import { EntryPointStatus } from "#lib/tmp/interface/status"
import { isValidTransactionType } from "#lib/utils/isValidTransactionType"
import { InvalidTransactionRecipientError, InvalidTransactionTypeError } from "../errors"

export async function waitForSubmitReceipt(params: WaitForReceiptParameters): Promise<HappyTxReceipt> {
    const { txHash, happyTxHash } = params

    const happyTx = await happyTransactionService.findByHappyTxHashOrThrow(happyTxHash)

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, pollingInterval: 500 })

    if (typeof receipt.to !== "string") throw new InvalidTransactionRecipientError(happyTxHash)
    if (!isValidTransactionType(receipt.type)) throw new InvalidTransactionTypeError(happyTxHash)

    return {
        happyTxHash,

        /** Account that sent the HappyTx. */
        account: happyTx.account,

        /** The nonce of the HappyTx. */
        nonceTrack: happyTx.nonceTrack,
        nonceValue: happyTx.nonceValue,

        /** EntryPoint to which the HappyTx was submitted onchain. */
        entryPoint: receipt.to,

        /** Result of onchain submission of the HappyTx. */
        status: receipt.status === "success" ? EntryPointStatus.Success : EntryPointStatus.UnexpectedReverted,

        /** Logs emitted by HappyTx. */
        logs: receipt.logs.filter((l) => l.address === receipt.to),

        /**
         * The revertData carried by one of our custom error, or the raw deal for
         * "otherReverted". Empty if `!status.endsWith("Reverted")`.
         */
        revertData: getRevertData(receipt),

        /**
         * The selector carried by one of our custom error.
         * Empty if `!status.endsWith("Failed")`
         */
        failureReason: getFailureReason(receipt),

        /** Gas used by the HappyTx */
        gasUsed: receipt.gasUsed,

        /** Total gas cost for the HappyTx in wei (inclusive submitter fee) */
        gasCost: receipt.gasUsed * receipt.effectiveGasPrice,

        /**
         * Receipt for the transaction that carried the HappyTx.
         * Note that this transaction is allowed to do other things besides
         * carrying the happyTx, and could potentially have carried multiple happyTxs.
         */
        txReceipt: {
            blobGasPrice: receipt.blobGasPrice,
            blobGasUsed: receipt.blobGasUsed,
            blockHash: receipt.blockHash,
            blockNumber: receipt.blockNumber,
            contractAddress: receipt.contractAddress || null,
            cumulativeGasUsed: receipt.cumulativeGasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice,
            from: receipt.from,
            gasUsed: receipt.gasUsed,
            logs: receipt.logs.map((l) => ({ ...l, blockNumber: l.blockNumber })),
            logsBloom: receipt.logsBloom,
            root: receipt.root,
            status: receipt.status,
            to: receipt.to,
            transactionHash: receipt.transactionHash,
            transactionIndex: receipt.transactionIndex,
            type: receipt.type,
        },
    }
}

type WaitForReceiptParameters = { txHash: Hex; happyTxHash: Hex }

function getRevertData(_receipt: TransactionReceipt): `0x${string}` {
    // TODO: handle failures
    return "0x" as const
}
function getFailureReason(_receipt: TransactionReceipt): `0x${string}` {
    // TODO: handle failures
    return "0x" as const
}
