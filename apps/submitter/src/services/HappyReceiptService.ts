import { publicClient } from "#src/clients"
import type { HappyReceiptRepository } from "#src/database/repositories/HappyReceiptRepository"
import { logger } from "#src/logger"
import type { HappyTxReceipt } from "#src/tmp/interface/HappyTxReceipt"
import type { Hash, Receipt, TransactionTypeName } from "#src/tmp/interface/common_chain"
import type { EntryPointStatus } from "#src/tmp/interface/status"

export class HappyReceiptService {
    constructor(private happyReceiptRepository: HappyReceiptRepository) {}

    async findByHappyTxHash(happyTxHash: Hash): Promise<HappyTxReceipt | undefined> {
        const receipt = await this.happyReceiptRepository.findByHash(happyTxHash)

        if (!receipt) return

        const transactionReceipt = await publicClient.getTransactionReceipt({ hash: receipt.transactionHash })

        logger.warn("[HappyReceiptService.findByHash] Warning: Logs not yet implemented")

        return {
            happyTxHash: happyTxHash,
            status: receipt.status as EntryPointStatus,
            account: receipt.account,
            nonceTrack: receipt.nonceTrack,
            nonceValue: receipt.nonceValue,
            entryPoint: receipt.entryPoint,
            logs: transactionReceipt.logs.filter((l) => l.address === receipt.entryPoint),
            revertData: receipt.revertData,
            failureReason: receipt.failureReason,
            gasUsed: receipt.gasUsed,
            gasCost: receipt.gasCost,
            txReceipt: {
                ...transactionReceipt,
                type: transactionReceipt.type as TransactionTypeName, // TODO: validate this cast
                contractAddress: transactionReceipt.contractAddress || null,
            } satisfies Receipt,
        }
    }

    async findByHappyTxHashOrThrow(happyTxHash: Hash) {
        const receipt = await this.findByHappyTxHash(happyTxHash)
        if (!receipt) throw new Error("Failed to find receipt")
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
        const data = await this.happyReceiptRepository.insert({
            ...newData2,
            transactionHash: txReceipt.transactionHash,
        })
        return data
    }

    async insertOrThrow(newData: HappyTxReceipt) {
        const data = await this.insert(newData)
        if (!data) throw new Error("Failed to find receipt")
        return data
    }
}
