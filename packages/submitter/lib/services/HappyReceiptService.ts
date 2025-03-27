import { publicClient } from "#lib/clients"
import type { HappyReceiptRepository } from "#lib/database/repositories/HappyReceiptRepository"
import { SubmitterError } from "#lib/errors/contract-errors"
import { logger } from "#lib/logger"
import type { HappyTxReceipt } from "#lib/tmp/interface/HappyTxReceipt"
import type { Hash, Receipt, TransactionTypeName } from "#lib/tmp/interface/common_chain"
import type { EntryPointStatus } from "#lib/tmp/interface/status"
import { isValidTransactionType } from "#lib/utils/isValidTransactionType"

export class HappyReceiptService {
    constructor(private happyReceiptRepository: HappyReceiptRepository) {}

    async findByHappyTxHash(happyTxHash: Hash): Promise<HappyTxReceipt | undefined> {
        const happyReceipt = await this.happyReceiptRepository.findByHappyTxHash(happyTxHash)
        if (!happyReceipt) return

        const transactionReceipt = await publicClient.getTransactionReceipt({ hash: happyReceipt.transactionHash })

        logger.warn("[HappyReceiptService.findByHash] Warning: Logs not yet implemented")

        if (!isValidTransactionType(transactionReceipt.type))
            throw new SubmitterError(`[${happyTxHash}] Invalid receipt.type`)

        return {
            happyTxHash: happyTxHash,
            status: happyReceipt.status as EntryPointStatus,
            account: happyReceipt.account,
            nonceTrack: happyReceipt.nonceTrack,
            nonceValue: happyReceipt.nonceValue,
            entryPoint: happyReceipt.entryPoint,
            logs: transactionReceipt.logs.filter((l) => l.address === happyReceipt.entryPoint),
            revertData: happyReceipt.revertData,
            failureReason: happyReceipt.failureReason,
            gasUsed: happyReceipt.gasUsed,
            gasCost: happyReceipt.gasCost,
            txReceipt: {
                ...transactionReceipt,
                type: transactionReceipt.type as TransactionTypeName, // TODO: validate this cast
                contractAddress: transactionReceipt.contractAddress || null,
            } satisfies Receipt,
        }
    }

    async findByHappyTxHashOrThrow(happyTxHash: Hash) {
        const receipt = await this.findByHappyTxHash(happyTxHash)
        if (!receipt) throw new SubmitterError("Failed to find receipt")
        return receipt
    }

    async findByHappyTxHashWithTimeout(happyTxHash: Hash, timeout: number, pollInterval = 250) {
        const end = Date.now() + timeout

        while (true) {
            const receipt = await this.findByHappyTxHash(happyTxHash)
            if (receipt) return receipt
            if (Date.now() > end) return
            await new Promise((resolve) => setTimeout(resolve, pollInterval))
        }
    }

    async insert(newData: HappyTxReceipt) {
        const { txReceipt, ...newData2 } = newData
        return await this.happyReceiptRepository.insert({
            ...newData2,
            transactionHash: txReceipt.transactionHash,
        })
    }

    async insertOrThrow(newData: HappyTxReceipt) {
        const data = await this.insert(newData)
        if (!data) throw new SubmitterError("Failed to find receipt")
        return data
    }
}
