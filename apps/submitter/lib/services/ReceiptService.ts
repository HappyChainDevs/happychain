import { type Address, type Hash, type Hex, delayed, getOrSet, promiseWithResolvers, sleep } from "@happy.tech/common"
import type { Log, TransactionReceipt, WatchBlocksReturnType } from "viem"
import { deployment, env } from "#lib/env"
import { outputForExecuteError, outputForRevertError } from "#lib/handlers/errors"
import { WaitForReceipt, type WaitForReceiptOutput } from "#lib/handlers/waitForReceipt"
import { notePossibleMisbehaviour } from "#lib/policies/misbehaviour"
import { computeHash, dbService, simulationCache } from "#lib/services"
import { type Boop, type BoopLog, type BoopReceipt, Onchain, type OnchainStatus, SubmitterError } from "#lib/types"
import { headerCouldContainBoop } from "#lib/utils/bloom"
import { publicClient } from "#lib/utils/clients"
import { logger } from "#lib/utils/logger"
import { decodeEvent, decodeRawError, getSelectorFromEventName } from "#lib/utils/parsing"

export const BOOP_STARTED_SELECTOR = getSelectorFromEventName("BoopExecutionStarted") as Hex
export const BOOP_SUBMITTED_SELECTOR = getSelectorFromEventName("BoopSubmitted") as Hex

type PendingBoopInfo = {
    count: number
    pwr: PromiseWithResolvers<WaitForReceiptOutput>
}
type PendingEvmTxInfo = {
    boop: Boop
    sub: PendingBoopInfo
}
export type WaitForInclusionArgs = {
    boopHash: Hash
    timeout?: number
    evmTxHash?: Hash
}

export class ReceiptService {
    #pendingEvmTxs = new Map</* evmTxHash: */ Hash, PendingEvmTxInfo>()
    #pendingBoops = new Map</* boopHash: */ Hash, PendingBoopInfo>()

    constructor() {
        void this.#startBlockWatcher()
    }

    async waitForInclusion({
        boopHash,
        evmTxHash,
        timeout = env.RECEIPT_TIMEOUT,
    }: WaitForInclusionArgs): Promise<WaitForReceiptOutput> {
        let boop: Boop | undefined

        // 1. fast‑path → receipt already in DB?
        try {
            let receipt: BoopReceipt | undefined
            ;({ boop, receipt } = await dbService.findReceiptOrBoop(boopHash))
            if (receipt) return { status: WaitForReceipt.Success, receipt }
            if (!boop) return { status: WaitForReceipt.UnknownBoop, description: "Unknown boop." }
        } catch (dbError) {
            logger.error("Error while looking up boop receipt", boopHash, dbError)
            return {
                status: SubmitterError.UnexpectedError,
                description: `Failed to query database for boop status: ${String(dbError)}`,
            }
        }

        // 2. get or create pending boop info
        const sub = getOrSet(this.#pendingBoops, boopHash, () => ({
            pwr: promiseWithResolvers<WaitForReceiptOutput>(),
            count: 0,
        }))
        sub.count += 1

        // 3. if txHash supplied, creating pending EVM tx info
        if (evmTxHash) this.#pendingEvmTxs.set(evmTxHash, { boop, sub })

        // 4. race the real receipt vs timeout
        const output = await Promise.race([
            sub.pwr.promise,
            delayed<WaitForReceiptOutput>(timeout, () => ({
                status: SubmitterError.ReceiptTimeout,
                description: "Timed out while waiting for receipt.",
            })),
        ])

        // 5. clean‑up for this call (other calls might still be safely waiting, e.g. if this one timed out)
        if (--sub.count === 0) {
            this.#pendingBoops.delete(boopHash)
            if (evmTxHash) this.#pendingEvmTxs.delete(evmTxHash)
        }

        return output
    }

    async #startBlockWatcher(): Promise<void> {
        const initialRetryDelay = 1000 // ms
        const maxRetryDelay = 30_000 // ms
        const maxRetries = 5
        let currentRetry = 0

        // we actually exit loop in catch clause, if ever
        while (currentRetry < maxRetries) {
            const { promise, reject } = promiseWithResolvers<void>()
            let unwatch: WatchBlocksReturnType | null = null
            try {
                unwatch = publicClient.watchBlocks({
                    // If `poll` is undefined and transport is WebSocket (or fallback with first WebSocket transport),
                    // Viem won't poll but subscribe, even if `pollingInterval` is set.
                    pollingInterval: 200,
                    includeTransactions: false,
                    emitOnBegin: true,
                    emitMissed: true,
                    onBlock: (header) => {
                        if (currentRetry > 0) {
                            logger.info("Block watcher recovered and processed a block. Resetting retry attempts.")
                            currentRetry = 0
                        }
                        if (!header.hash || !headerCouldContainBoop(header)) return
                        for (const evmTxHash of header.transactions) {
                            const pending = this.#pendingEvmTxs.get(evmTxHash)
                            if (!pending) continue // not one of our transactions
                            void this.#handleTransactionInBlock(evmTxHash, pending.boop, pending.sub)
                        }
                    },
                    onError: (e) => {
                        // We technically do not need to restart the watcher here, but we have observed cases where
                        // it is in fact necessary to do so, so for now we always restart.
                        logger.error("Error in block watcher", e)
                        reject(e)
                    },
                })
                logger.trace("Block watcher started successfully.")
                await promise // block forever unless an error occurs
            } catch (e) {
                // TODO Can we make this more robust with a fallback to another RPC?
                //      We have Viem fallback enabled, but how does it work with watchblocks and websocket?
                if (unwatch) unwatch()
                else logger.error("Error starting block watcher", e)
                if (currentRetry === maxRetries)
                    throw new Error(`Unable to restart block watch after ${maxRetries} attempts`)
                currentRetry++
                const delay = Math.min(initialRetryDelay * 2 ** (currentRetry - 1), maxRetryDelay) // exponential backoff
                logger.warn(`Retrying block watcher in ${delay / 1000} seconds (Attempt ${currentRetry}/${maxRetries})`)
                sleep(delay)
            }
        }
    }

    async #handleTransactionInBlock(txHash: Hash, boop: Boop, sub: PendingBoopInfo): Promise<void> {
        try {
            const receipt = await publicClient.getTransactionReceipt({ hash: txHash })
            sub.pwr.resolve(await this.#getReceiptResult(boop, receipt))
        } catch {
            sub.pwr.resolve({
                status: SubmitterError.ReceiptTimeout,
                description: "Transaction receipt could not be fetched after multiple retries.",
            })
        }
    }

    async #getReceiptResult(boop: Boop, evmTxReceipt: TransactionReceipt): Promise<WaitForReceiptOutput> {
        const boopHash = computeHash(boop)
        if (evmTxReceipt.status === "success")
            return {
                status: WaitForReceipt.Success,
                receipt: this.#buildReceipt(boop, evmTxReceipt),
            }
        // TODO get the revertData from a log and populate here
        const decoded = decodeRawError("0x")
        const entryPoint = evmTxReceipt.to! // not a contract deploy, so will be set
        let output = outputForRevertError(entryPoint, boop, boopHash, decoded)
        const simulation = await simulationCache.findSimulation(entryPoint, boopHash)
        if (
            // detect out-of-gas
            output.status === Onchain.UnexpectedReverted &&
            simulation &&
            simulation.status === Onchain.Success &&
            evmTxReceipt.gasUsed === BigInt(simulation.gas)
        )
            output = {
                status: Onchain.EntryPointOutOfGas,
                description:
                    "The boop was included onchain but ran out of gas. If the transaction is self-paying, " +
                    "this can indicate a `payout` function that consumes more gas during execution than during simulation.",
            }
        notePossibleMisbehaviour(boop, output)
        return output
    }

    #buildReceipt(boop: Boop, evmTxReceipt: TransactionReceipt): BoopReceipt {
        if (evmTxReceipt.status !== "success") throw "BUG: buildReceipt"
        const boopHash = computeHash(boop)
        const logs = this.#filterLogs(evmTxReceipt.logs, boopHash)
        const entryPoint = evmTxReceipt.to! // not a contract deploy, so will be set

        let status: OnchainStatus = Onchain.Success
        let description = "Boop executed successfully."
        let revertData: Hex = "0x"
        for (const log of logs) {
            const decoded = decodeEvent(log)
            if (!decoded) continue
            const entryPointStatus = getEntryPointStatusFromEventName(decoded.eventName)
            if (!entryPointStatus) continue
            // Don't get pranked by contracts emitting the same event.
            if (log.address.toLowerCase() !== entryPoint.toLowerCase()) continue
            const error = outputForExecuteError(boop, entryPointStatus, decoded.args.revertData as Hex)
            status = error.status
            description = error.description || "unknown error"
            revertData = error.revertData ?? "0x"
        }

        const receipt = {
            boopHash,
            entryPoint: evmTxReceipt.to as Address, // will be populated, our receipts are not contract deployemnts
            status,
            logs,
            description,
            revertData,
            evmTxHash: evmTxReceipt.transactionHash,
            blockHash: evmTxReceipt.blockHash,
            blockNumber: evmTxReceipt.blockNumber,
            gasPrice: evmTxReceipt.effectiveGasPrice,
            boop,
        }
        void dbService.saveReceipt(receipt)
        return receipt
    }

    #filterLogs(logs: Log[], boopHash: Hash): BoopLog[] {
        let select = false
        const filteredLogs: BoopLog[] = []
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
                const { address, topics, data } = log
                filteredLogs.push({ address, topics, data })
            } else if (fromEntryPoint && log.topics[0] === BOOP_STARTED_SELECTOR) {
                select = true
            }
        }
        return []
    }
}

function getEntryPointStatusFromEventName(eventName: string): OnchainStatus | undefined {
    switch (eventName) {
        case "CallReverted":
            return Onchain.CallReverted
        case "ExecutionRejected":
            return Onchain.ExecuteRejected
        case "ExecutionReverted":
            return Onchain.ExecuteReverted
    }
}
