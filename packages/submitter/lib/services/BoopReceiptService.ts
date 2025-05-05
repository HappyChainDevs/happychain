import type { Hash, Hex } from "@happy.tech/common"
import { type Boop, computeBoopHash } from "#lib/client"
import type { BoopReceiptRepository } from "#lib/database/repositories/BoopReceiptRepository"
import { deployment, env } from "#lib/env"
import { SubmitterError } from "#lib/errors"
import type { BoopReceipt, Log, OnchainStatus, Receipt, TransactionTypeName } from "#lib/types"
import { publicClient } from "#lib/utils/clients"
import { decodeEvent, getSelectorFromEventName } from "#lib/utils/parsing"

export class BoopReceiptService {
    constructor(private boopReceiptRepository: BoopReceiptRepository) {}

    async findByBoopHash(boopHash: Hash): Promise<BoopReceipt | undefined> {
        const boopReceipt = await this.boopReceiptRepository.findByBoopHash(boopHash)
        if (!boopReceipt) return
        const transactionReceipt = await publicClient.getTransactionReceipt({ hash: boopReceipt.transactionHash })

        return {
            boopHash: boopHash,
            status: boopReceipt.status as OnchainStatus,
            account: boopReceipt.account,
            nonceTrack: boopReceipt.nonceTrack,
            nonceValue: boopReceipt.nonceValue,
            entryPoint: boopReceipt.entryPoint,
            logs: this.#filterLogs(transactionReceipt.logs, boopHash),
            revertData: boopReceipt.revertData,
            gasUsed: boopReceipt.gasUsed,
            gasCost: boopReceipt.gasCost,
            txReceipt: {
                ...transactionReceipt,
                type: transactionReceipt.type as TransactionTypeName,
                contractAddress: transactionReceipt.contractAddress || null,
            } satisfies Receipt,
        }
    }

    readonly #boopExecutionStartedSelector = getSelectorFromEventName("BoopExecutionStarted") as Hex
    readonly #boopSubmittedSelector = getSelectorFromEventName("BoopSubmitted") as Hex

    #filterLogs(logs: Log[], boopHash: Hash): Log[] {
        let select = false
        const filteredLogs: Log[] = []
        for (const log of logs) {
            const fromEntryPoint = log.address.toLowerCase() === deployment.EntryPoint.toLowerCase()
            if (fromEntryPoint && log.topics[0] === this.#boopSubmittedSelector) {
                const decodedLog = decodeEvent(log)
                if (!decodedLog) throw new Error("Found BoopSumitted event but could not decode")
                const decodedHash = computeBoopHash(env.CHAIN_ID, decodedLog.args as Boop)
                if (decodedHash === boopHash) {
                    return filteredLogs
                } else {
                    select = false
                    filteredLogs.length = 0
                }
            } else if (select) {
                filteredLogs.push(log)
            } else if (fromEntryPoint && log.topics[0] === this.#boopExecutionStartedSelector) {
                select = true
            }
        }
        return []
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
