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
    sub?: PendingBoopInfo // `sub` can legitimately be undefined here
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

    // getTransactionReceipt retry configuration (for both fast lane and block watcher path)
    #receiptRetryAttempts = 5 // Max number of retries for getTransactionReceipt
    #receiptInitialRetryDelayMs = 500 // Initial delay for receipt fetch in ms (0.5 seconds)
    #receiptMaxRetryDelayMs = 10000 // Max delay for receipt fetch in ms (10 seconds)

    // NEW: Fast Lane Configuration
    #fastLaneInitialPollingIntervalMs = 100; // Poll every 100ms
    #fastLaneMaxAttempts = 10; // Try 10 times, so max ~1 second for fast lane

    constructor() {
        this.#startBlockWatcher()
    }

    #startBlockWatcher() {
        if (this.#unwatch) {
            this.#unwatch()
            this.#unwatch = undefined
        }

        try {
            this.#unwatch = publicClient.watchBlocks({
                includeTransactions: false,
                onBlock: (blockHeader) => {
                    this.#currentBlockWatcherRetryAttempt = 0
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
            this.#currentBlockWatcherRetryAttempt = 0
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
            // Decide if you want to re-throw or handle gracefully. For a service, throwing can propagate critical failure.
            throw new Error("Max retry attempts reached for block watcher")
        }
    }

    async waitForInclusion({
        boopHash,
        txHash,
        timeout = env.RECEIPT_TIMEOUT,
    }: WaitForInclusionArgs): Promise<WaitForReceiptOutput> {
        let boop: Boop | undefined

        // 1. fast-path → already have receipt in DB?
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

        // 2. book (or re-use) a shared subscription object
        const sub = getOrSet(this.#pendingBoops, boopHash, () => ({
            pwr: promiseWithResolvers<WaitForReceiptOutput>(),
            count: 0,
        }))
        sub.count += 1

        // 3. if caller gave a txHash, link it to pending-hashes map
        if (txHash) {
            const pend = getOrSet(this.#pendingEvmTxs, txHash, () => ({ boop: boop!, sub: sub })); // boop is guaranteed at this point
            pend.sub = sub;
        }

        // --- NEW: Fast Lane Promise ---
        let fastLanePromise: Promise<WaitForReceiptOutput | null> = Promise.resolve(null); // Resolves to null if fast lane doesn't find
        if (txHash) { // Only attempt fast lane if we have a txHash
            fastLanePromise = (async () => {
                let currentAttempt = 0;
                while (currentAttempt < this.#fastLaneMaxAttempts) {
                    try {
                        const r = await publicClient.getTransactionReceipt({ hash: txHash });
                        const out = await this.#getReceiptResult(boop!, r); // Process and save the receipt
                        // Crucially, resolve the main promise for ALL waiters
                        // This call is idempotent, so it's safe even if already resolved by another path.
                        if (sub.pwr) { // Defensive check
                            sub.pwr.resolve(out);
                        }
                        return out; // Resolve fastLanePromise with the result
                    } catch (e) {
                        // Only retry if it's "receipt not found"
                        const isRetryableError = e && typeof e === "object" && "name" in e && e.name === "TransactionReceiptNotFoundError";
                        if (isRetryableError) {
                            currentAttempt++;
                            await new Promise(resolve => setTimeout(resolve, this.#fastLaneInitialPollingIntervalMs));
                        } else {
                            // Some other error, log it but don't resolve main promise via fast lane
                            logger.warn(`Fast lane for ${txHash} encountered non-retryable error: ${String(e)}`);
                            return null; // Fast lane failed, let the other path win
                        }
                    }
                }
                logger.trace(`Fast lane for ${txHash} timed out after ${this.#fastLaneMaxAttempts} attempts.`);
                return null; // Fast lane didn't find it within its attempts/time
            })();
        }

        // 4. Race all promises: fastLane (if active), block watcher, and global timeout
        try {
            const result = await Promise.race([
                fastLanePromise.then(res => {
                    if (res) return res;
                    return new Promise<WaitForReceiptOutput>(() => {}); // Indefinitely pending if fast lane fails/times out
                }),
                sub.pwr.promise, // The promise resolved by #handleTransactionInBlock
                new Promise<WaitForReceiptOutput>((_, reject) =>
                    setTimeout(() => reject(new ReceiptTimeout()), timeout),
                ),
            ]) as WaitForReceiptOutput;

            return result;

        } catch (e) {
            return e instanceof ReceiptTimeout
                ? { status: SubmitterError.ReceiptTimeout, description: "Timed out while waiting for receipt." }
                : { status: SubmitterError.UnexpectedError, description: String(e) };
        } finally {
            // 5. clean-up for this *caller* (might not empty the subscription yet)
            if (--sub.count === 0) this.#pendingBoops.delete(boopHash);
            if (txHash) {
                const pend = this.#pendingEvmTxs.get(txHash);
                if (pend && pend.sub === sub) { // Check if the *same* sub is linked
                    delete pend.sub; // Remove the link
                    if (!Object.keys(pend).length) { // If there are no other properties left on pend
                        this.#pendingEvmTxs.delete(txHash);
                    }
                }
            }
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
                // Pass pending.sub directly. handleTransactionInBlock will check for undefined.
                void this.#handleTransactionInBlock(hash as Hash, pending.boop, pending.sub)
            }
        } catch (e) {
            logger.warn("block-watcher error", e)
        }
    }

    // Change sub to be optional
    async #handleTransactionInBlock(txHash: Hash, boop: Boop, sub: PendingBoopInfo | undefined): Promise<void> {
        // Defensive check: If sub is undefined, the original waitForInclusion call
        // has likely already cleaned up its subscription (e.g., timed out or fast lane resolved).
        // Nothing more to do here.
        if (!sub) {
            logger.trace(`No active subscriber (sub) found for tx ${txHash}. Skipping receipt handling.`);
            return;
        }

        let currentAttempt = 0
        let delay = this.#receiptInitialRetryDelayMs

        while (currentAttempt < this.#receiptRetryAttempts) {
            try {
                const r = await publicClient.getTransactionReceipt({ hash: txHash })
                const out = await this.#getReceiptResult(boop, r)

                // Success: Resolve the single subscription
                // Add a defensive check here too, though if `sub` is defined, `sub.pwr` should be.
                if (sub.pwr) {
                    sub.pwr.resolve(out)
                } else {
                    logger.trace(`Promise for tx ${txHash} already resolved/cleaned up. Skipping final resolution.`);
                }
                return // Exit on success
            } catch (e) {
                const isRetryableError =
                    e && typeof e === "object" && "name" in e && e.name === "TransactionReceiptNotFoundError"

                currentAttempt++
                if (currentAttempt < this.#receiptRetryAttempts) {
                    logger.warn(
                        `Failed to fetch receipt for ${txHash} (attempt ${currentAttempt}/${this.#receiptRetryAttempts}). ` +
                            `Error: ${isRetryableError ? "TransactionReceiptNotFoundError" : String(e)}. Retrying in ${delay / 1000}s...`,
                    )
                    await new Promise((resolve) => setTimeout(resolve, delay))
                    delay = Math.min(delay * 2, this.#receiptMaxRetryDelayMs)
                } else {
                    logger.error(
                        `Max retry attempts reached for receipt ${txHash}. Could not get receipt. Final error: ${String(e)}`,
                    )
                    // If max attempts reached, resolve with error and clean up
                    // Crucially, check if sub.pwr is still valid BEFORE attempting to resolve it.
                    if (sub.pwr) {
                        sub.pwr.resolve({
                            status: SubmitterError.ReceiptTimeout,
                            description: "Transaction receipt could not be fetched after multiple retries via block watcher.",
                        })
                    } else {
                        logger.trace(`Promise for tx ${txHash} already resolved/cleaned up. Skipping final error resolution.`);
                    }
                    return
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

        const decoded = decodeRawError("0x")
        const entryPoint = evmTxReceipt.to!
        let output = outputForRevertError(entryPoint, boop, boopHash, decoded)
        notePossibleMisbehaviour(boop, output)

        const simulation = await simulationCache.findSimulation(entryPoint, boopHash)

        if (
            output.status === Onchain.UnexpectedReverted &&
            simulation &&
            simulation.status === Onchain.Success &&
            evmTxReceipt.gasUsed === BigInt(simulation.gas)
        ) {
            if (boop.payer === boop.account) {
                logger.trace("Reverted onchain with out-of-gas for self-paying boop", boopHash)
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
        if (evmTxReceipt.status !== "success") throw "BUG: buildReceipt" // Should only be called for success
        const boopHash = computeHash(boop)
        const logs = this.#filterLogs(evmTxReceipt.logs, boopHash)
        const entryPoint = evmTxReceipt.to!

        let status: OnchainStatus = Onchain.Success
        let description = "Boop executed successfully."
        let revertData: Hex = "0x"
        for (const log of logs) {
            const decoded = decodeEvent(log)
            if (!decoded) continue
            const entryPointStatus = getEntryPointStatusFromEventName(decoded.eventName)
            if (!entryPointStatus) continue
            if (log.address.toLowerCase() !== entryPoint.toLowerCase()) continue
            const error = outputForExecuteError(boop, entryPointStatus, decoded.args.revertData as Hex)
            status = error.status
            description = error.description || "unknown error"
            revertData = error.revertData ?? "0x"
        }

        const receipt = {
            boopHash,
            entryPoint: evmTxReceipt.to as Address,
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