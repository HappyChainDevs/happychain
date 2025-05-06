import type { Address, Hash } from "@happy.tech/common"
import { type Account, type Hex, parseGwei } from "viem"
import { env } from "#lib/env"
import { InvalidTransactionRecipientError } from "#lib/errors"
import type { Boop, BoopReceipt, TransactionTypeName } from "#lib/types"
import { Onchain } from "#lib/types"
import { publicClient, walletClient } from "#lib/utils/clients"
import { logger } from "#lib/utils/logger"
import type { BoopReceiptService } from "./BoopReceiptService"
import type { BoopStateService } from "./BoopStateService"
import type { BoopTransactionService } from "./BoopTransactionService"
import { computeBoopHash } from "./computeBoopHash"
import { findBoopExecutionAccount } from "./evmAccounts"

export class SubmitterService {
    constructor(
        private boopTransactionService: BoopTransactionService,
        private boopStateService: BoopStateService,
        private boopReceiptService: BoopReceiptService,
    ) {}

    async add(entryPoint: Address, boop: Boop, boopHash: Hash) {
        logger.trace("Saving boop to db", boopHash)
        // TODO yolo db is broken
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        return await this.boopTransactionService.insert({ boopHash, entryPoint, ...boop } as any)
    }

    async monitorReceipt(boop: Boop, nonce: number, txHash: Hash) {
        try {
            const boopHash = computeBoopHash(BigInt(env.CHAIN_ID), boop)
            const persisted = await this.boopTransactionService.findByBoopHash(boopHash)
            if (!persisted?.id) {
                const logData = { txHash, boopHash, boop }
                logger.warn("Persisted Boop not found. Could not finalize.", logData)
                return
            }

            const cancelTimer = setTimeout(() => {
                logger.warn("Transaction timed out. Cancelling transaction.", { txHash, boopHash })
                const account = findBoopExecutionAccount(boopHash, boop.account, boop.nonceTrack)
                this.cancelTransaction({ txHash, nonce, account })
            }, 5_000)

            const receipt = await this.waitForSubmitReceipt({ boopHash, txHash })

            clearTimeout(cancelTimer)

            const { id: boopReceiptId } = receipt ? await this.boopReceiptService.insertOrThrow(receipt) : { id: null }

            return await this.boopStateService.insert({
                status: receipt.status,
                boopTransactionId: persisted.id,
                boopReceiptId: boopReceiptId as number,
                included: !!receipt.txReceipt.transactionHash,
            })
        } catch (err) {
            logger.warn("Error while finalizing Boop", err)
        }
    }

    private async cancelTransaction({ txHash, nonce, account }: { txHash: Hash; nonce: number; account: Account }) {
        const stuckTx = await publicClient.getTransaction({ hash: txHash })
        const maxFeePerGas = stuckTx.maxFeePerGas! + parseGwei("5") // bump by +5 gwei
        const maxPriorityFeePerGas = stuckTx.maxPriorityFeePerGas! + parseGwei("3")

        await walletClient.sendTransaction({
            to: account.address,
            value: 0n,
            nonce,
            maxFeePerGas,
            maxPriorityFeePerGas,
            account,
        })
    }

    private async waitForSubmitReceipt(params: { txHash: Hex; boopHash: Hex }): Promise<BoopReceipt> {
        const { txHash, boopHash } = params

        const boop = await this.boopTransactionService.findByBoopHashOrThrow(boopHash)

        const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash,
            pollingInterval: 500,
            timeout: 20_000,
            onReplaced: (replacement) => {
                logger.info("Transaction replaced", { txHash, replacement })
            },
        })

        if (typeof receipt.to !== "string") throw new InvalidTransactionRecipientError(boopHash)

        return {
            boopHash,

            /** Account that sent the Boop. */
            account: boop.account,

            /** The nonce of the Boop. */
            nonceTrack: boop.nonceTrack,
            nonceValue: boop.nonceValue,

            /** EntryPoint to which the Boop was submitted onchain. */
            entryPoint: receipt.to,

            /** Result of onchain submission of the Boop. */
            // TODO that needs much more complex logic, which currently lives in execute.ts
            status: receipt.status === "success" ? Onchain.Success : Onchain.UnexpectedReverted,

            /** Logs emitted by Boop. */
            logs: receipt.logs.filter((l) => l.address === receipt.to),

            /**
             * The revertData carried by one of our custom error, or the raw deal for
             * "otherReverted". Empty if `!status.endsWith("Reverted")`.
             */
            revertData: "0x",

            /** Gas used by the Boop */
            gasUsed: receipt.gasUsed,

            /** Total gas cost for the Boop in wei (inclusive submitter fee) */
            gasCost: receipt.gasUsed * receipt.effectiveGasPrice,

            /**
             * Receipt for the transaction that carried the Boop.
             * Note that this transaction is allowed to do other things besides
             * carrying the boop, and could potentially have carried multiple boops.
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
                type: receipt.type as TransactionTypeName,
            },
        }
    }
}
