import { type Address, type Hash, type Hex, delayed, getOrSet, promiseWithResolvers } from "@happy.tech/common"
import { type Log, type Transaction, type TransactionReceipt, TransactionRejectedRpcError } from "viem"
import { deployment, env } from "#lib/env"
import { outputForExecuteError, outputForRevertError } from "#lib/handlers/errors"
import { submitInternal } from "#lib/handlers/submit/submit"
import { WaitForReceipt, type WaitForReceiptOutput } from "#lib/handlers/waitForReceipt"
import { notePossibleMisbehaviour } from "#lib/policies/misbehaviour"
import { computeHash, dbService, findExecutionAccount, simulationCache } from "#lib/services"
import { type Boop, type BoopLog, type BoopReceipt, Onchain, type OnchainStatus, SubmitterError } from "#lib/types"
import { headerCouldContainBoop } from "#lib/utils/bloom"
import { publicClient, walletClient } from "#lib/utils/clients"
import { getMaxPriorityFeePerGas } from "#lib/utils/gas"
import { logger, receiptLogger } from "#lib/utils/logger"
import { decodeEvent, decodeRawError, getSelectorFromEventName } from "#lib/utils/parsing"
import type { BlockService } from "./BlockService"

export const BOOP_STARTED_SELECTOR = getSelectorFromEventName("BoopExecutionStarted") as Hex
export const BOOP_SUBMITTED_SELECTOR = getSelectorFromEventName("BoopSubmitted") as Hex

type PendingBoopInfo = {
    count: number
    /** Current boop version with most recent gas values */
    boop: Boop
    boopHash: Hash
    interval: NodeJS.Timeout | undefined
    latestEvmTxHash?: Hash
    evmTxHashes: Set<Hash>
    pwr: PromiseWithResolvers<WaitForReceiptOutput>
}

export type WaitForInclusionArgs = {
    boopHash: Hash
    /** Mutated boop with latest gas values */
    boop?: Boop
    timeout?: number
    evmTxHash?: Hash
}

export class BoopReceiptService {
    // Note: mutate only after initial creation. Both maps track the same BoopInfo reference.
    #pendingBoopInfos = new Map</* boopHash: */ Hash, PendingBoopInfo>()
    #evmTxHashMap = new Map</* evmTxHash: */ Hash, PendingBoopInfo>()
    #cancelledBoopHashes = new Set<Hash>() // hashes of boops that were cancelled
    #blockService: BlockService

    constructor(blockService: BlockService) {
        this.#blockService = blockService
        this.#blockService.onBlock((header) => {
            if (!header.hash) return

            //
            if (!this.#cancelledBoopHashes && !headerCouldContainBoop(header)) return

            for (const evmTxHash of header.transactions) {
                this.#cancelledBoopHashes.delete(evmTxHash) // clear cancelled boops for this block
                const boop = this.#evmTxHashMap.get(evmTxHash)
                if (!boop) continue // not one of our transactions
                void this.#handleTransactionInBlock(evmTxHash, boop)
            }
        })
    }

    async waitForInclusion({
        boopHash,
        boop,
        evmTxHash,
        timeout = env.RECEIPT_TIMEOUT,
    }: WaitForInclusionArgs): Promise<WaitForReceiptOutput> {
        // 1. fast‑path → receipt already in DB?
        try {
            const { boop: savedBoop, receipt } = await dbService.findReceiptOrBoop(boopHash)
            if (receipt) return { status: WaitForReceipt.Success, receipt }
            if (!savedBoop) return { status: WaitForReceipt.UnknownBoop, description: "Unknown boop." }
            boop ??= savedBoop
        } catch (dbError) {
            logger.error("Error while looking up boop receipt", boopHash, dbError)
            return {
                status: SubmitterError.UnexpectedError,
                description: `Failed to query database for boop status: ${String(dbError)}`,
            }
        }

        // 2. get or create pending boop info
        const sub = getOrSet(
            this.#pendingBoopInfos,
            boopHash,
            () =>
                ({
                    pwr: promiseWithResolvers<WaitForReceiptOutput>(),
                    count: 0,
                    boop,
                    boopHash,
                    interval: undefined,
                    evmTxHashes: new Set<Hash>(),
                }) satisfies PendingBoopInfo,
        )

        sub.count += 1

        // 3. if evmTxHash supplied, and no interval exists, start monitoring for replacement or cancellation
        if (evmTxHash) {
            this.#setActiveEvmTxHash(sub, evmTxHash)
            sub.interval ??= setInterval(() => void this.cancelOrReplace(sub), env.STUCK_TX_WAIT_TIME)
        }

        // 4. race the real receipt vs timeout
        const output = await Promise.race([
            sub.pwr.promise,
            delayed<WaitForReceiptOutput>(timeout, () => ({
                status: SubmitterError.ReceiptTimeout,
                description: "Timed out while waiting for receipt.",
            })),
        ])

        if (sub.interval && output.status !== SubmitterError.ReceiptTimeout) clearInterval(sub.interval)

        // 5. clean‑up for this call (other calls might still be safely waiting, e.g. if this one timed out)
        if (--sub.count === 0) {
            const hashes = this.#pendingBoopInfos.get(boopHash)?.evmTxHashes
            for (const hash of hashes ?? []) this.#evmTxHashMap.delete(hash)
            this.#pendingBoopInfos.delete(boopHash)
        }

        return output
    }

    // Note: must be 'private func' not '#func' to be callable and spied on from the tests!
    private async cancelOrReplace(sub: PendingBoopInfo): Promise<void> {
        if (!sub.latestEvmTxHash) {
            receiptLogger.warn("No evmTxHash set for boop, cannot cancel or replace", sub.boopHash)
            return
        }

        const tx = await publicClient.getTransaction({ hash: sub.latestEvmTxHash })

        receiptLogger.warn(`Resubmitting Transaction: Boop: ${sub.boopHash}, Previous EVM Tx: ${sub.latestEvmTxHash}`)

        // use boopCache first, as `.get` will update last access time
        const results = await submitInternal(
            { boop: sub.boop, entryPoint: tx.to! },
            { earlyExit: false, replacedTx: tx },
        )
        // Only cancel if the simulation was not successful, otherwise keep retying indefinitely
        if (results.status !== Onchain.Success) await this.#cancelEvmTx(sub, tx)
    }

    async #cancelEvmTx(sub: PendingBoopInfo, tx: Transaction) {
        this.#cancelledBoopHashes.add(sub.boopHash)
        receiptLogger.warn(`Cancelling Transaction: Boop: ${sub.boopHash}, Previous EVM Tx: ${sub.latestEvmTxHash}`)
        const account = findExecutionAccount(sub.boop)

        const maxPriorityFeePerGas = getMaxPriorityFeePerGas(tx)

        const block = await this.#blockService.getCurrentBlock()

        const latestBaseFee = block.baseFeePerGas!
        const estimatedNextBaseFee = (latestBaseFee * 1125n) / 1000n // +12.5% worst case
        const calculatedMaxFeePerGas = estimatedNextBaseFee + maxPriorityFeePerGas
        const repriced = (tx.maxFeePerGas! * 115n) / 100n
        const maxFeePerGas = calculatedMaxFeePerGas > repriced ? calculatedMaxFeePerGas : repriced

        try {
            const cancelHash = await walletClient.sendTransaction({
                to: account.address,
                value: 0n,
                nonce: tx.nonce,
                // Take the higher number here to ensure most favourable outcome
                maxFeePerGas,
                maxPriorityFeePerGas,
                account,
            })

            this.#setActiveEvmTxHash(sub, cancelHash)
        } catch (error) {
            // Must have landed on chain earlier and cancellation is no longer possible
            if (error instanceof TransactionRejectedRpcError && error.message.includes("nonce too low")) {
                return
            }

            logger.error(error)
        }
    }

    #setActiveEvmTxHash(sub: PendingBoopInfo, evmTxHash: Hash): void {
        sub.latestEvmTxHash = evmTxHash
        sub.evmTxHashes.add(evmTxHash)
        this.#evmTxHashMap.set(evmTxHash, sub)
    }

    async #handleTransactionInBlock(txHash: Hash, sub: PendingBoopInfo): Promise<void> {
        try {
            const receipt = await publicClient.getTransactionReceipt({ hash: txHash })
            sub.pwr.resolve(await this.#getReceiptResult(sub.boop, receipt))
        } catch {
            sub.pwr.resolve({
                status: SubmitterError.ReceiptTimeout,
                description: "Transaction receipt could not be fetched after multiple retries.",
            })
        }
    }

    async #getReceiptResult(boop: Boop, evmTxReceipt: TransactionReceipt): Promise<WaitForReceiptOutput> {
        const boopHash = computeHash(boop)
        if (evmTxReceipt.status === "success") {
            // TODO: verify the boop itself actually succeeded?
            if (evmTxReceipt.logs?.length) {
                return {
                    status: WaitForReceipt.Success,
                    receipt: this.#buildReceipt(boop, evmTxReceipt),
                }
            }

            // it would be good to check that its a 0 value tx here, but we don't have immediate access to the
            // raw transaction, so will just rely on self-sends
            if (evmTxReceipt.to === evmTxReceipt.from) {
                return {
                    status: SubmitterError.ReceiptTimeout,
                    description:
                        "The boop was included in the mempool but got stuck. " +
                        "It was replaced with a 0 value transaction and cancelled.",
                }
            }
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
        ) {
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
        if (evmTxReceipt.status !== "success") throw new Error("BUG: buildReceipt")
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
            entryPoint: evmTxReceipt.to as Address, // will be populated, our receipts are not contract deployments
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
