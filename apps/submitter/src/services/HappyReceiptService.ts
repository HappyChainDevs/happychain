import { publicClient } from "#src/clients"
import type { HappyReceiptRepository } from "#src/database/repositories/HappyReceiptRepository"
import { logger } from "#src/logger"
import type { HappyTxReceipt } from "#src/tmp/interface/HappyTxReceipt"
import type { Hash, Receipt } from "#src/tmp/interface/common_chain"
import type { EntryPointStatus } from "#src/tmp/interface/status"

export class HappyReceiptService {
    constructor(private happyReceiptRepository: HappyReceiptRepository) {}

    async findByHash(hash: Hash): Promise<HappyTxReceipt | undefined> {
        const receipt = await this.happyReceiptRepository.findByHash(hash)

        if (!receipt) return

        const transactionReceipt = await publicClient.getTransactionReceipt({ hash: receipt.transactionHash })

        logger.warn("[HappyReceiptService.findByHash] Warning: Logs not yet implemented")

        return {
            happyTxHash: hash,
            status: receipt.status as EntryPointStatus,
            account: receipt.account,
            nonceTrack: receipt.nonceTrack,
            nonceValue: receipt.nonceValue,
            entryPoint: receipt.entryPoint,
            logs: [],
            revertData: receipt.revertData,
            failureReason: receipt.failureReason,
            gasUsed: receipt.gasUsed,
            gasCost: receipt.gasCost,
            txReceipt: transactionReceipt as Receipt, // TODO: validation
        }
    }

    async findByHashOrThrow(hash: Hash) {
        const receipt = await this.findByHash(hash)
        if (!receipt) throw new Error("Failed to find receipt")
        return receipt
    }

    async findByHashWithTimeout(hash: Hash, timeout: number) {
        const end = Date.now() + timeout

        while (true) {
            if (Date.now() > end) return
            const receipt = await this.findByHash(hash)
            if (receipt) return receipt
            await new Promise((resolve) => setTimeout(resolve, 250))
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
