import { type Address, type Hash, type Hex, getOrSet, promiseWithResolvers } from "@happy.tech/common"
import { type Block, type Log, type TransactionReceipt, WaitForTransactionReceiptTimeoutError } from "viem"
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

const BOOP_STARTED_SELECTOR = getSelectorFromEventName("BoopExecutionStarted") as Hex
const BOOP_SUBMITTED_SELECTOR = getSelectorFromEventName("BoopSubmitted") as Hex

export class ReceiptTimeout extends Error {}

type Subscription = {
    count: number
    pwr: PromiseWithResolvers<WaitForReceiptOutput>
    lastSubTimestamp: number
    evmTxHash?: Hash
}

export type WaitForInclusionArgs = {
    boopHash: Hash
    timeout?: number
    txHash?: Hash
}

type Pending = {
    boop: Boop
    subs: Set<Subscription>
}
export class ReceiptService {
    #pendingHashes = new Map<Hash, Pending>()
    #subscriptions = new Map<Hash, Subscription>()

    constructor() {
        if (publicClient.transport.type === "webSocket") {
            publicClient.watchBlocks({
                includeTransactions: false, // dont need the txs unless bloom filter matches
                onBlock: (blockHeader) => this.#onNewHead(blockHeader),
            })
        } else {
            publicClient.watchBlocks({
                includeTransactions: false,
                onBlock: (header) => this.#onNewHead(header),
                pollingInterval: 500,
            })
        }
    }

    async waitForInclusion({
        boopHash,
        txHash,
        timeout = env.RECEIPT_TIMEOUT,
    }: WaitForInclusionArgs): Promise<WaitForReceiptOutput> {
        // 1. fast‑path → already have receipt in DB?
        const { boop, receipt } = await dbService.findReceiptOrBoop(boopHash)
        if (receipt) return { status: WaitForReceipt.Success, receipt }
        if (!boop) return { status: WaitForReceipt.UnknownBoop, description: "Unknown boop." }

        // 2. book (or re‑use) a shared subscription object
        const sub = getOrSet(this.#subscriptions, boopHash, () => ({
            pwr: promiseWithResolvers<WaitForReceiptOutput>(),
            count: 0,
        }))
        sub.count += 1

        // 3. if caller gave a txHash, link it to pending‑hashes map
        if (txHash) {
            const pend = getOrSet(this.#pendingHashes, txHash, () => ({ boop, subs: new Set() }))
            pend.subs.add(sub)
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
            if (--sub.count === 0) this.#subscriptions.delete(boopHash)
        }
    }
    async #onNewHead(blockHeader: Block) {
        try {
            if (!blockHeader.hash) return
            if (!headerCouldContainBoop(blockHeader)) return
            const block = await publicClient.getBlock({
                blockHash: blockHeader.hash,
                includeTransactions: true,
            })
            for (const tx of block.transactions) {
                const hash = typeof tx === "string" ? tx : tx.hash
                const pending = this.#pendingHashes.get(hash as Hash)
                if (!pending) continue // not one of ours

                try {
                    const r = await publicClient.getTransactionReceipt({ hash: hash as Hash })
                    const out = await this.#getReceiptResult(pending.boop, r)

                    pending.subs.forEach((s) => s.pwr.resolve(out))
                    this.#pendingHashes.delete(hash as Hash)
                } catch (_e) {
                    /* ignore TransactionReceiptNotFound – node still building receipt */
                }
            }
        } catch (e) {
            logger.warn("block‑watcher error", e)
        }
    }

    #registerWait(boopHash: Hash): Subscription {
        const sub = getOrSet(this.#subscriptions, boopHash, {
            count: 0,
            pwr: promiseWithResolvers<WaitForReceiptOutput>(),
            lastSubTimestamp: 0,
        })
        ++sub.count
        sub.lastSubTimestamp = Date.now()
        return sub
    }

    async #unregisterWait(boopHash: Hash): Promise<void> {
        const sub = this.#subscriptions.get(boopHash)
        if (!sub) return
        if (--sub.count === 0) this.#subscriptions.delete(boopHash)
    }

    async #waitAndCreateReceipt(sub: Subscription, evmTxHash: Hash, boop: Boop): Promise<void> {
        const args = { hash: evmTxHash, pollingInterval: 500, timeout: env.RECEIPT_TIMEOUT }
        const boopHash = computeHash(boop)
        sub.evmTxHash = evmTxHash
        while (sub.count > 0 && sub.evmTxHash === evmTxHash) {
            try {
                logger.trace("Waiting for receipt", boopHash, evmTxHash)
                const evmTxReceipt = await publicClient.waitForTransactionReceipt(args)
                sub.pwr.resolve(await this.#getReceiptResult(boop, evmTxReceipt))
                break
            } catch (error) {
                // Retry, but only if there are still subscribers and we haven't replaced the transaction.
                if (error instanceof WaitForTransactionReceiptTimeoutError) continue
                // We could also retry, but we fail fast unless we're already monitoring another tx.
                if (sub.evmTxHash === evmTxHash) sub.pwr.reject(error)
                break
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
