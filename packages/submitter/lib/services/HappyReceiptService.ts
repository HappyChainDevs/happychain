import { publicClient } from "#lib/clients"
import type { HappyReceiptRepository } from "#lib/database/repositories/HappyReceiptRepository"
import { SubmitterError } from "#lib/errors/submitter-errors"
import { logger } from "#lib/logger"
import type { HappyTxReceipt } from "#lib/tmp/interface/HappyTxReceipt"
import type { Hash, Receipt } from "#lib/tmp/interface/common_chain"
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
            gasUsed: happyReceipt.gasUsed,
            gasCost: happyReceipt.gasCost,
            txReceipt: {
                ...transactionReceipt,
                type: transactionReceipt.type,
                contractAddress: transactionReceipt.contractAddress || null,
            } satisfies Receipt,
        }
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

    private formatInsertData(newData: HappyTxReceipt) {
        const { txReceipt, ...newData2 } = newData
        return {
            ...newData2,
            transactionHash: txReceipt.transactionHash,
        }
    }

    async insertOrThrow(newData: HappyTxReceipt) {
        const data = await this.happyReceiptRepository.insert(this.formatInsertData(newData))
        if (!data) throw new SubmitterError("Failed to find receipt")
        return data
    }
}
