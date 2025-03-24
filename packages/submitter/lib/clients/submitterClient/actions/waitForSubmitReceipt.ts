import type { Hex } from "viem"
import { publicClient } from "#lib/clients"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import type { HappyTxReceipt } from "#lib/tmp/interface/HappyTxReceipt"
import { EntryPointStatus } from "#lib/tmp/interface/status"
import { isValidTransactionType } from "#lib/utils/isValidTransactionType"

export async function waitForSubmitReceipt(params: WaitForReceiptParameters): Promise<HappyTxReceipt> {
    const { txHash, happyTxHash, happyTx } = params

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, pollingInterval: 500 })

    if (typeof receipt.to !== "string") throw new Error(`[${happyTxHash}] Invalid receipt.to`)

    if (!isValidTransactionType(receipt.type)) throw new Error(`[${happyTxHash}] Invalid receipt.type`)

    // TODO: is this the correct approach?
    const entrypointLogs = receipt.logs.filter((l) => l.address === receipt.to)

    // TODO: this makes many assumptions (such as it was fully a success)...
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
        status: EntryPointStatus.Success,

        /** Logs emitted by HappyTx. */
        logs: entrypointLogs,

        /**
         * The revertData carried by one of our custom error, or the raw deal for
         * "otherReverted". Empty if `!status.endsWith("Reverted")`.
         */
        revertData: "0x" as const,

        /**
         * The selector carried by one of our custom error.
         * Empty if `!status.endsWith("Failed")`
         */
        failureReason: "0x" as const,

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

type WaitForReceiptParameters = { txHash: Hex; happyTx: HappyTx; happyTxHash: Hex }
