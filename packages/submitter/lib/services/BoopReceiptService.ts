import { type Address, type Hash, type Hex, sleep } from "@happy.tech/common"
import { type Boop, type TransactionTypeName, computeBoopHash } from "#lib/client"
import type { BoopReceiptRepository } from "#lib/database/repositories/BoopReceiptRepository"
import { deployment, env } from "#lib/env"
import { SubmitterError } from "#lib/errors"
import type { BoopReceipt, Log, OnchainStatus, Receipt } from "#lib/types"
import { publicClient } from "#lib/utils/clients"
import { decodeEvent, getSelectorFromEventName } from "#lib/utils/parsing"

const BOOP_STARTED_SELECTOR = getSelectorFromEventName("BoopExecutionStarted") as Hex
const BOOP_SUBMITTED_SELECTOR = getSelectorFromEventName("BoopSubmitted") as Hex

export class BoopReceiptService {
    constructor(private boopReceiptRepository: BoopReceiptRepository) {}

    async find(boopHash: Hash, timeout = 0, pollInterval = 250): Promise<BoopReceipt | undefined> {
        if (timeout === 0) return this.#findNow(boopHash)
        const end = Date.now() + timeout
        while (true) {
            const receipt = await this.#findNow(boopHash)
            if (receipt) return receipt
            if (Date.now() > end) return
            await sleep(pollInterval)
        }
    }

    async #findNow(boopHash: Hash): Promise<BoopReceipt | undefined> {
        // We need this because otherwise we can't know the association between a boopHash and a txHash.
        const boopReceipt = await this.boopReceiptRepository.findByBoopHash(boopHash)
        if (!boopReceipt) return
        const txReceipt = await publicClient.getTransactionReceipt({ hash: boopReceipt.transactionHash })
        txReceipt.contractAddress ??= null // coerce to null
        type txReceiptType = typeof txReceipt & { contractAddress: Address | null; type: TransactionTypeName }

        return {
            boopHash: boopHash,
            status: boopReceipt.status as OnchainStatus,
            account: boopReceipt.account,
            nonceTrack: boopReceipt.nonceTrack,
            nonceValue: boopReceipt.nonceValue,
            entryPoint: boopReceipt.entryPoint,
            logs: this.#filterLogs(txReceipt.logs, boopHash),
            revertData: boopReceipt.revertData,
            gasUsed: boopReceipt.gasUsed,
            gasCost: boopReceipt.gasCost,
            txReceipt: txReceipt as txReceiptType satisfies Receipt,
        }
    }

    #filterLogs(logs: Log[], boopHash: Hash): Log[] {
        let select = false
        const filteredLogs: Log[] = []
        for (const log of logs) {
            const fromEntryPoint = log.address.toLowerCase() === deployment.EntryPoint.toLowerCase()
            if (fromEntryPoint && log.topics[0] === BOOP_SUBMITTED_SELECTOR) {
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
            } else if (fromEntryPoint && log.topics[0] === BOOP_STARTED_SELECTOR) {
                select = true
            }
        }
        return []
    }

    // TODO horrible return type conflict here
    async insertOrThrow(receipt: BoopReceipt) {
        const { txReceipt, ...rest } = receipt
        const receiptToInsert = { ...rest, transactionHash: txReceipt.transactionHash }
        const data = await this.boopReceiptRepository.insert(receiptToInsert)
        if (!data) throw new SubmitterError("Failed to insert receipt")
        return data
    }
}
