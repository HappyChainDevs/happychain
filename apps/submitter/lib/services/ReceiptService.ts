import { type Address, type Hash, type Hex, getOrSet, promiseWithResolvers } from "@happy.tech/common"
import type { Block, Log, TransactionReceipt } from "viem"
import { deployment, env } from "#lib/env"
import { outputForExecuteError, outputForRevertError } from "#lib/handlers/errors"
import { WaitForReceipt, type WaitForReceiptOutput } from "#lib/handlers/waitForReceipt"
import { notePossibleMisbehaviour } from "#lib/policies/misbehaviour"
import { computeHash, dbService, simulationCache } from "#lib/services"
import { type Boop, type BoopLog, type BoopReceipt, Onchain, type OnchainStatus, SubmitterError } from "#lib/types"
import { headerCouldContainBoop } from "#lib/utils/bloom.ts"
import { publicClient } from "#lib/utils/clients"
import { logger } from "#lib/utils/logger.ts"
import { decodeEvent, decodeRawError, getSelectorFromEventName } from "#lib/utils/parsing"

export const BOOP_STARTED_SELECTOR = getSelectorFromEventName("BoopExecutionStarted") as Hex
export const BOOP_SUBMITTED_SELECTOR = getSelectorFromEventName("BoopSubmitted") as Hex

export class ReceiptTimeout extends Error {}

type PendingBoopInfo = {
    count: number
    pwr: PromiseWithResolvers<WaitForReceiptOutput>
}
type PendingEvmTxInfo = {
    boop: Boop
    sub?: PendingBoopInfo
}
export type WaitForInclusionArgs = {
    boopHash: Hash
    timeout?: number
    txHash?: Hash
}

export class ReceiptService {
    #pendingEvmTxs = new Map</* evmTxHash: */ Hash, PendingEvmTxInfo>()
    #pendingBoops = new Map</* boopHash: */ Hash, PendingBoopInfo>()

    #unwatch: (() => void) | undefined

    // Block watcher retry configuration
    #blockWatcherRetryAttempts = 5 // Max number of retry attempts for the block watcher
    #blockWatcherInitialRetryDelayMs = 1000 // Initial delay in ms (1 second)
    #blockWatcherMaxRetryDelayMs = 30000 // Max delay in ms (30 seconds)
    #currentBlockWatcherRetryAttempt = 0

    // getTransactionReceipt retry configuration
    #receiptRetryAttempts = 5 // Max number of retries for getTransactionReceipt
    #receiptInitialRetryDelayMs = 500 // Initial delay for receipt fetch in ms (0.5 seconds)
    #receiptMaxRetryDelayMs = 10000 // Max delay for receipt fetch in ms (10 seconds)

    constructor() {
        this.#startBlockWatcher()
    }

    async waitForInclusion({
        boopHash,
        txHash,
        timeout = env.RECEIPT_TIMEOUT,
    }: WaitForInclusionArgs): Promise<WaitForReceiptOutput> {
        let boop: Boop | undefined

        // 1. fast‑path → already have receipt in DB?
        try {
            const result = await dbService.findReceiptOrBoop(boopHash)
            if (result.receipt) {
                return { status: WaitForReceipt.Success, receipt: result.receipt }
            }
            if (!result.boop) {
                return { status: WaitForReceipt.UnknownBoop, description: "Unknown boop." }
            }
            boop = result.boop
        } catch (dbError) {
            logger.error("Error while looking up boop receipt", boopHash, dbError)
            return {
                status: SubmitterError.UnexpectedError,
                description: `Failed to query database for boop status: ${String(dbError)}`,
            }
        }

        // 2. book (or re‑use) a shared subscription object
        const sub = getOrSet(this.#pendingBoops, boopHash, () => ({
            pwr: promiseWithResolvers<WaitForReceiptOutput>(),
            count: 0,
        }))
        // Increment count regardless of whether it's a new or existing subscription
        sub.count += 1

        // 3. if caller gave a txHash, link it to pending‑hashes map
        if (txHash) {
            const pend = getOrSet(this.#pendingEvmTxs, txHash, () => ({ boop, sub: sub }))
            pend.sub = sub
        }

        // 4. race the real receipt vs timeout
        try {
            return await Promise.race([
                sub.pwr.promise,
                new Promise<WaitForReceiptOutput>((_, reject) =>
                    setTimeout(() => reject(new ReceiptTimeout()), timeout),
                ),
            ])
        } catch (e) {
            return e instanceof ReceiptTimeout
                ? { status: SubmitterError.ReceiptTimeout, description: "Timed out while waiting for receipt." }
                : { status: SubmitterError.UnexpectedError, description: String(e) }
        } finally {
            // 5. clean‑up for this *caller* (might not empty the subscription yet)
            if (--sub.count === 0) this.#pendingBoops.delete(boopHash)
            if (txHash) {
                const pend = this.#pendingEvmTxs.get(txHash)
                if (pend && pend.sub === sub) {
                    // biome-ignore lint/performance/noDelete: <explanation>
                    delete pend.sub
                    if (!Object.keys(pend).length || !pend.sub) {
                        // If no other properties or sub is gone
                        this.#pendingEvmTxs.delete(txHash)
                    }
                }
            }
        }
    }

    #startBlockWatcher() {
        if (this.#unwatch) {
            // If already watching, stop it first to prevent multiple watchers
            this.#unwatch()
            this.#unwatch = undefined
        }

        try {
            this.#unwatch = publicClient.watchBlocks({
                includeTransactions: false,
                onBlock: (blockHeader) => {
                    this.#currentBlockWatcherRetryAttempt = 0 // Reset retry counter on successful block processing
                    void this.#onNewHead(blockHeader)
                },
                pollingInterval: publicClient.transport.type === "webSocket" ? undefined : 200,
                onError: (e) => {
                    logger.error("Error in block watcher", e)
                    this.#handleBlockWatcherError(e)
                },
                emitMissed: true,
            })
            logger.info("Block watcher started successfully.")
            this.#currentBlockWatcherRetryAttempt = 0 // Reset retry counter on successful start
        } catch (e) {
            logger.error("Error starting block watcher initially", e)
            this.#handleBlockWatcherError(e)
        }
    }

    #handleBlockWatcherError(error: unknown) {
        if (this.#currentBlockWatcherRetryAttempt < this.#blockWatcherRetryAttempts) {
            this.#currentBlockWatcherRetryAttempt++
            const delay = Math.min(
                this.#blockWatcherInitialRetryDelayMs * (2 ** this.#currentBlockWatcherRetryAttempt - 1),
                this.#blockWatcherMaxRetryDelayMs,
            )
            logger.warn(
                `Retrying block watcher in ${delay / 1000} seconds (Attempt ${this.#currentBlockWatcherRetryAttempt}/${this.#blockWatcherRetryAttempts})`,
            )
            setTimeout(() => this.#startBlockWatcher(), delay)
        } else {
            logger.error("Max retry attempts reached for block watcher. Unable to restart block watcher.", error)
            throw new Error("Max retry attempts reached for block watcher")
        }
    }

    async #onNewHead(blockHeader: Block) {
        try {
            if (!blockHeader.hash) return
            if (!headerCouldContainBoop(blockHeader)) return

            for (const tx of blockHeader.transactions) {
                const hash = typeof tx === "string" ? tx : tx.hash
                const pending = this.#pendingEvmTxs.get(hash as Hash)
                if (!pending) continue // not one of ours
                void this.#handleTransactionInBlock(hash as Hash, pending.boop, pending.sub!)
            }
        } catch (e) {
            logger.warn("block‑watcher error", e)
        }
    }

    async #handleTransactionInBlock(txHash: Hash, boop: Boop, sub: PendingBoopInfo): Promise<void> {
        let currentAttempt = 0
        let delay = this.#receiptInitialRetryDelayMs

        while (currentAttempt < this.#receiptRetryAttempts) {
            try {
                const r = await publicClient.getTransactionReceipt({ hash: txHash })
                const out = await this.#getReceiptResult(boop, r)

                // Success: Resolve the single subscription and clean up
                sub.pwr.resolve(out)
                this.#pendingEvmTxs.delete(txHash)
                return // Exit on success
            } catch (e) {
                // Determine if the error is retryable
                const isRetryableError =
                    e && typeof e === "object" && "name" in e && e.name === "TransactionReceiptNotFoundError"

                currentAttempt++
                if (currentAttempt < this.#receiptRetryAttempts) {
                    logger.warn(
                        `Failed to fetch receipt for ${txHash} (attempt ${currentAttempt}/${this.#receiptRetryAttempts}). ` +
                            `Error: ${isRetryableError ? "TransactionReceiptNotFoundError" : String(e)}. Retrying in ${delay / 1000}s...`,
                    )
                    await new Promise((resolve) => setTimeout(resolve, delay))
                    delay = Math.min(delay * 2, this.#receiptMaxRetryDelayMs) // Exponential backoff
                } else {
                    // Max attempts reached, resolve with error and clean up
                    logger.error(
                        `Max retry attempts reached for receipt ${txHash}. Could not get receipt. Final error: ${String(e)}`,
                    )
                    sub.pwr.resolve({
                        status: SubmitterError.ReceiptTimeout,
                        description: "Transaction receipt could not be fetched after multiple retries.",
                    })
                    this.#pendingEvmTxs.delete(txHash)
                    return // Exit the function after max retries
                }
            }
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
        notePossibleMisbehaviour(boop, output)

        const simulation = await simulationCache.findSimulation(entryPoint, boopHash)

        if (
            // detect out-of-gas
            output.status === Onchain.UnexpectedReverted &&
            simulation &&
            simulation.status === Onchain.Success &&
            evmTxReceipt.gasUsed === BigInt(simulation.gas)
        ) {
            if (boop.payer === boop.account) {
                logger.trace("Reverted onchain with out-of-gas for self-paying boop", boopHash)
                // TODO note account as problematic
            } else {
                logger.warn("Reverted onchain with out-of-gas for sponsored boop", boopHash)
            }
            output = {
                status: Onchain.EntryPointOutOfGas,
                description:
                    "The boop was included onchain but ran out of gas. If the transaction is self-paying, " +
                    "this can indicate a `payout` function that consumes more gas during execution than during simulation.",
            }
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
