import type { Hash } from "@happy.tech/common"
import { publicClient } from "#lib/clients"
import type { BoopReceiptRepository } from "#lib/database/repositories/BoopReceiptRepository"
import { SubmitterError } from "#lib/errors/submitter-errors"
import type { BoopReceipt } from "#lib/interfaces/BoopReceipt"
import type { OnchainStatus } from "#lib/interfaces/Onchain"
import type { Receipt } from "#lib/interfaces/ethereum"
import { isValidTransactionType } from "#lib/utils/isValidTransactionType"

export class BoopReceiptService {
    constructor(private boopReceiptRepository: BoopReceiptRepository) {}

    async findByBoopHash(boopHash: Hash): Promise<BoopReceipt | undefined> {
        const boopReceipt = await this.boopReceiptRepository.findByBoopHash(boopHash)
        if (!boopReceipt) return
        const transactionReceipt = await publicClient.getTransactionReceipt({ hash: boopReceipt.transactionHash })

        if (!isValidTransactionType(transactionReceipt.type))
            throw new SubmitterError(`[${boopHash}] Invalid receipt.type`)

        return {
            boopHash: boopHash,
            status: boopReceipt.status as OnchainStatus,
            account: boopReceipt.account,
            nonceTrack: boopReceipt.nonceTrack,
            nonceValue: boopReceipt.nonceValue,
            entryPoint: boopReceipt.entryPoint,
            logs: transactionReceipt.logs.filter((l) => l.address === boopReceipt.entryPoint),
            revertData: boopReceipt.revertData,
            gasUsed: boopReceipt.gasUsed,
            gasCost: boopReceipt.gasCost,
            txReceipt: {
                ...transactionReceipt,
                type: transactionReceipt.type,
                contractAddress: transactionReceipt.contractAddress || null,
            } satisfies Receipt,
        }
    }

    async findByBoopHashWithTimeout(boopHash: Hash, timeout: number, pollInterval = 250) {
        const end = Date.now() + timeout

        while (true) {
            const receipt = await this.findByBoopHash(boopHash)
            if (receipt) return receipt
            if (Date.now() > end) return
            await new Promise((resolve) => setTimeout(resolve, pollInterval))
        }
    }

    private formatInsertData(newData: BoopReceipt) {
        const { txReceipt, ...newData2 } = newData
        return {
            ...newData2,
            transactionHash: txReceipt.transactionHash,
        }
    }

    async insertOrThrow(newData: BoopReceipt) {
        const data = await this.boopReceiptRepository.insert(this.formatInsertData(newData))
        if (!data) throw new SubmitterError("Failed to find receipt")
        return data
    }
}
