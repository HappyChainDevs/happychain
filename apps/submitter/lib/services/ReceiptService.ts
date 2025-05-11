import { type Address, type Hash, type Hex, sleep } from "@happy.tech/common"
import { type Result, ResultAsync, err, ok } from "neverthrow"
import type { TransactionReceipt } from "viem"
import { deployment, env } from "#lib/env"
import { computeHash, dbService } from "#lib/services"
import type { StoredReceipt } from "#lib/services/DatabaseService"
import {
    type Boop,
    type BoopReceipt,
    type EVMReceipt,
    type Log,
    Onchain,
    type OnchainStatus,
    type TransactionTypeName,
} from "#lib/types"
import { publicClient } from "#lib/utils/clients"
import { logger } from "#lib/utils/logger.ts"
import { decodeEvent, getSelectorFromEventName } from "#lib/utils/parsing"

const BOOP_STARTED_SELECTOR = getSelectorFromEventName("BoopExecutionStarted") as Hex
const BOOP_SUBMITTED_SELECTOR = getSelectorFromEventName("BoopSubmitted") as Hex

export class ReceiptService {
    async getReceipt(boopHash: Hash, txHash?: Hash, boop?: Boop): Promise<BoopReceipt | undefined> {
        try {
            // Try loading from DB.
            const storedReceipt = await dbService.findReceipt(boopHash)
            if (storedReceipt) return this.#loadReceiptFromDB(storedReceipt)
            // Otherwise, build the boop receipt from the boop & the EVM receipt.
            // Get receipt, for which we need an EVM tx hash.
            if (!txHash) return // TODO store txHash in DB
            const promise = publicClient.getTransactionReceipt({ hash: txHash })
            const result = await ResultAsync.fromPromise(promise, (e) => e)
            if (result.isErr()) return
            const txReceipt = result.value
            dbService.saveEVMReceipt(boopHash, txReceipt as EVMReceipt)
            // If we have a boop, build direct.
            if (boop) return this.#buildReceipt(boop, txReceipt)
            // Otherwise fetch it from the DB.
            const storedBoop = await dbService.findBoop(boopHash)
            return storedBoop ? this.#buildReceipt(storedBoop, txReceipt) : undefined
        } catch (error) {
            // We only expect database errors here.
            logger.error("Error while retrieving receipt", boopHash, error)
        }
    }

    async waitForInclusion(
        boop: Boop,
        txHash: Hash,
        timeout = env.RECEIPT_TIMEOUT,
        pollingInterval = 500,
    ): Promise<Result<BoopReceipt, unknown>> {
        const boopHash = computeHash(boop)
        try {
            // Try loading from DB.
            const storedReceipt = await dbService.findReceipt(boopHash)
            if (storedReceipt) return ok(this.#loadReceiptFromDB(storedReceipt))
            // Wait for EVM tx receipt, then build the boop receipt once obtained.
            // TODO this needs a timeout / cancellation policy
            const txReceipt = await publicClient.waitForTransactionReceipt({ hash: txHash, pollingInterval, timeout })
            // TODO maybe we consider this isn't a "canonical boop receipt" if the evm tx reverted?
            dbService.saveEVMReceipt(boopHash, txReceipt as EVMReceipt)
            const receipt = this.#buildReceipt(boop, txReceipt)
            return ok(receipt)
        } catch (error) {
            logger.warn("Error while monitoring receipt", boopHash, error)
            return err(error)
        }
    }

    // TODO delete? → after saving txHash alongside tx
    // TODO this is busted: we currently don't store logs, meaning we can't provide them in here
    //      no tests fail, but we should make one
    async find(boopHash: Hash, timeout = 0, pollInterval = 250): Promise<BoopReceipt | undefined> {
        if (timeout === 0) return this.getReceipt(boopHash)
        const end = Date.now() + timeout
        while (true) {
            const receipt = await this.getReceipt(boopHash)
            if (receipt) return receipt
            if (Date.now() > end) return
            await sleep(pollInterval)
        }
    }

    #buildReceipt(boop: Boop, txReceipt: TransactionReceipt): BoopReceipt {
        const boopHash = computeHash(boop)
        const receipt = {
            boopHash,
            account: boop.account,
            nonceTrack: boop.nonceTrack,
            nonceValue: boop.nonceValue,
            entryPoint: txReceipt.to as Address, // will be populated, our receipts are not contract deployemnts
            // TODO that needs much more complex logic, which currently lives in execute.ts
            status: txReceipt.status === "success" ? Onchain.Success : Onchain.UnexpectedReverted,
            // TODO filter just like in execute
            logs: this.#filterLogs(txReceipt.logs, boopHash),
            // TODO assign this correctly
            revertData: "0x" as Hex,
            // TODO think/check these values
            gasUsed: txReceipt.gasUsed,
            gasCost: txReceipt.gasUsed * txReceipt.effectiveGasPrice + boop.submitterFee,
            txReceipt: txReceipt as EVMReceipt, // subset + specialization that are known to hold in our use-case
        }
        void dbService.saveReceipt(receipt) // no need to wait on write to proceed
        return receipt
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

    #loadReceiptFromDB(storedReceipt: StoredReceipt): BoopReceipt {
        const it = storedReceipt
        return {
            boopHash: it.boopHash,
            status: it.status as OnchainStatus,
            entryPoint: it.entryPoint,
            account: it.account,
            nonceTrack: it.nonceTrack,
            nonceValue: it.nonceValue,
            logs: [], // TODO
            revertData: it.revertData,
            gasUsed: it.gasUsed,
            gasCost: it.gasCost,
            txReceipt: {
                type: it.type as TransactionTypeName,
                status: it.status as "success" | "reverted",
                transactionHash: it.transactionHash,
                from: it.from,
                to: it.to,
                blockHash: it.blockHash,
                blockNumber: it.blockNumber,
                effectiveGasPrice: it.effectiveGasPrice,
                gasUsed: it.gasUsed,
            } satisfies EVMReceipt,
        } satisfies BoopReceipt
    }
}
