import type { Hex } from "viem"
import { publicClient } from "#lib/clients"
import { InvalidTransactionRecipientError, InvalidTransactionTypeError } from "#lib/errors/submitter-errors"
import { logger } from "#lib/logger"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import type { HappyTxReceipt } from "#lib/tmp/interface/HappyTxReceipt"
import type { HappyTxState } from "#lib/tmp/interface/HappyTxState"
import { EntryPointStatus } from "#lib/tmp/interface/status"
import { computeHappyTxHash } from "#lib/utils/computeHappyTxHash"
import { isValidTransactionType } from "#lib/utils/isValidTransactionType"
import type { HappyReceiptService } from "./HappyReceiptService"
import type { HappyStateService } from "./HappyStateService"
import type { HappyTransactionService } from "./HappyTransactionService"

export class SubmitterService {
    constructor(
        private happyTransactionService: HappyTransactionService,
        private happyStateService: HappyStateService,
        private happyReceiptService: HappyReceiptService,
    ) {}

    async initialize(entryPoint: `0x${string}`, happyTx: HappyTx) {
        const happyTxHash = computeHappyTxHash(happyTx)
        return await this.happyTransactionService.insert({ happyTxHash, entryPoint, ...happyTx })
    }

    async finalize(happyTransactionId: number, state: HappyTxState) {
        const { id: happyReceiptId } = state.receipt
            ? await this.happyReceiptService.insertOrThrow(state.receipt)
            : { id: null }

        await this.happyStateService.insert({
            status: state.status,
            happyTransactionId,
            happyReceiptId: happyReceiptId as number,
            included: state.included ?? false,
        })
    }

    async finalizeWhenReady(happyTx: HappyTx, txHash: `0x${string}`) {
        try {
            const happyTxHash = computeHappyTxHash(happyTx)
            const persisted = await this.happyTransactionService.findByHappyTxHash(happyTxHash)
            if (!persisted?.id) {
                const logData = { txHash, happyTxHash, happyTx }
                logger.warn("Persisted HappyTx not found. Could not finalize.", logData)
                return
            }
            const receipt = await this.waitForSubmitReceipt({ happyTxHash, txHash })
            return await this.finalize(persisted.id, {
                status: receipt.status as unknown as EntryPointStatus.Success,
                included: Boolean(receipt.txReceipt.transactionHash) as true,
                receipt,
            })
        } catch (err) {
            logger.warn("Error while finalizing HappyTx", err)
        }
    }

    private async waitForSubmitReceipt(params: { txHash: Hex; happyTxHash: Hex }): Promise<HappyTxReceipt> {
        const { txHash, happyTxHash } = params

        const happyTx = await this.happyTransactionService.findByHappyTxHashOrThrow(happyTxHash)

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
            revertData: "0x",

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
}
