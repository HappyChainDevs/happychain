import type { Hex } from "viem"
import { publicClient } from "#lib/clients"
import { InvalidTransactionRecipientError, InvalidTransactionTypeError } from "#lib/errors/submitter-errors"
import { logger } from "#lib/logger"
import type { Boop } from "#lib/tmp/interface/Boop"
import type { BoopReceipt } from "#lib/tmp/interface/BoopReceipt"
import type { BoopState } from "#lib/tmp/interface/BoopState"
import { EntryPointStatus } from "#lib/tmp/interface/status"
import { computeBoopHash } from "#lib/utils/computeBoopHash"
import { isValidTransactionType } from "#lib/utils/isValidTransactionType"
import type { BoopReceiptService } from "./BoopReceiptService"
import type { BoopStateService } from "./BoopStateService"
import type { BoopTransactionService } from "./BoopTransactionService"

export class SubmitterService {
    constructor(
        private boopTransactionService: BoopTransactionService,
        private boopStateService: BoopStateService,
        private boopReceiptService: BoopReceiptService,
    ) {}

    async initialize(entryPoint: `0x${string}`, happyTx: Boop) {
        const boopHash = computeBoopHash(happyTx)
        return await this.boopTransactionService.insert({ boopHash, entryPoint, ...happyTx })
    }

    async finalize(boopTransactionId: number, state: BoopState) {
        const { id: boopReceiptId } = state.receipt
            ? await this.boopReceiptService.insertOrThrow(state.receipt)
            : { id: null }

        await this.boopStateService.insert({
            status: state.status,
            boopTransactionId,
            boopReceiptId: boopReceiptId as number,
            included: state.included ?? false,
        })
    }

    async finalizeWhenReady(happyTx: Boop, txHash: `0x${string}`) {
        try {
            const boopHash = computeBoopHash(happyTx)
            const persisted = await this.boopTransactionService.findByBoopHash(boopHash)
            if (!persisted?.id) {
                const logData = { txHash, boopHash, happyTx }
                logger.warn("Persisted HappyTx not found. Could not finalize.", logData)
                return
            }
            const receipt = await this.waitForSubmitReceipt({ boopHash, txHash })
            return await this.finalize(persisted.id, {
                status: receipt.status as unknown as EntryPointStatus.Success,
                included: Boolean(receipt.txReceipt.transactionHash) as true,
                receipt,
            })
        } catch (err) {
            logger.warn("Error while finalizing HappyTx", err)
        }
    }

    private async waitForSubmitReceipt(params: { txHash: Hex; boopHash: Hex }): Promise<BoopReceipt> {
        const { txHash, boopHash } = params

        const happyTx = await this.boopTransactionService.findByBoopHashOrThrow(boopHash)

        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, pollingInterval: 500 })

        if (typeof receipt.to !== "string") throw new InvalidTransactionRecipientError(boopHash)
        if (!isValidTransactionType(receipt.type)) throw new InvalidTransactionTypeError(boopHash)

        return {
            boopHash,

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
