import { type Address, type Hash, type Hex, sleep } from "@happy.tech/common"
import { type Result, err, ok } from "neverthrow"
import type { BoopReceiptRepository } from "#lib/database/repositories/BoopReceiptRepository"
import { auto } from "#lib/database/tables"
import { deployment } from "#lib/env"
import { computeHash } from "#lib/services"
import type { Boop, BoopReceipt, Log, OnchainStatus, Receipt, TransactionTypeName } from "#lib/types"
import { publicClient } from "#lib/utils/clients"
import { logger } from "#lib/utils/logger.ts"
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
        const receiptResult = await this.boopReceiptRepository.findByBoopHash(boopHash)
        if (receiptResult.isErr()) {
            logger.warn("Error while fetching receipt from DB", receiptResult.error)
            return
        }
        const boopReceipt = receiptResult.value
        if (!boopReceipt) return
        const txReceipt = await publicClient.getTransactionReceipt({ hash: boopReceipt.txHash })
        txReceipt.contractAddress ??= null
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
                if (!decodedLog) throw new Error("Found BoopSubmitted event but could not decode")
                const decodedHash = computeHash(decodedLog.args as Boop)
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

    async insert(receipt: BoopReceipt): Promise<Result<number, unknown>> {
        const { txReceipt, ...rest } = receipt
        const databaseEntry = { ...rest, id: auto, txHash: txReceipt.transactionHash }
        const result = await this.boopReceiptRepository.insert(databaseEntry)
        return result.isOk() ? ok(result.value.id) : err(result.error)
    }
}
