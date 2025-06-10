import {
    type Address,
    type Hash,
    type Hex,
    delayed,
    getOrSet,
    ifDef,
    promiseWithResolvers,
    sleep,
} from "@happy.tech/common"
import type { Log, TransactionReceipt } from "viem"
import { deployment, env } from "#lib/env"
import { outputForExecuteError, outputForRevertError } from "#lib/handlers/errors"
import { GetState } from "#lib/handlers/getState"
import { submitInternal } from "#lib/handlers/submit/submit"
import { WaitForReceipt, type WaitForReceiptOutput } from "#lib/handlers/waitForReceipt"
import { notePossibleMisbehaviour } from "#lib/policies/misbehaviour"
import { boopStore, computeHash, dbService, findExecutionAccount, simulationCache } from "#lib/services"
import { TraceMethod } from "#lib/telemetry/traces"
import {
    type Boop,
    type BoopGasInfo,
    type BoopLog,
    type BoopReceipt,
    type EvmTxInfo,
    Onchain,
    type OnchainStatus,
    SubmitterError,
    extractFeeInfo,
} from "#lib/types"
import { isNonceTooLowError, walletClient } from "#lib/utils/clients"
import { getFees } from "#lib/utils/gas"
import { logger, receiptLogger } from "#lib/utils/logger"
import { decodeEvent, decodeRawError, getSelectorFromEventName } from "#lib/utils/parsing"
import type { EvmReceiptService } from "./EvmReceiptService"

export const BOOP_STARTED_SELECTOR = getSelectorFromEventName("BoopExecutionStarted") as Hex
export const BOOP_SUBMITTED_SELECTOR = getSelectorFromEventName("BoopSubmitted") as Hex

type PendingBoopInfo = {
    count: number
    boop: Boop
    boopHash: Hash
    entryPoint: Address | undefined
    interval: NodeJS.Timeout | undefined
    latestEvmTx?: EvmTxInfo
    boopGasForEvmTxHash: Map<Hash, BoopGasInfo | undefined>
    pwr: PromiseWithResolvers<WaitForReceiptOutput>
}

export type WaitForInclusionArgs =
    | {
          boopHash: Hash
          entryPoint?: undefined
          boop?: undefined
          timeout?: undefined
          evmTxInfo?: undefined
      }
    | {
          boopHash: Hash
          entryPoint: Address
          boop: Boop
          timeout?: number
          evmTxInfo: EvmTxInfo
      }

export class BoopReceiptService {
    #pendingBoopInfos = new Map</* boopHash: */ Hash, PendingBoopInfo>()
    #evmTxHashMap = new Map</* evmTxHash: */ Hash, PendingBoopInfo>()
    #evmReceiptService: EvmReceiptService

    constructor(evmReceiptService: EvmReceiptService) {
        this.#evmReceiptService = evmReceiptService
    }

    @TraceMethod("BoopReceiptService.waitForInclusion")
    async waitForInclusion({
        boopHash,
        boop,
        entryPoint,
        evmTxInfo,
        timeout = env.BOOP_RECEIPT_TIMEOUT,
    }: WaitForInclusionArgs): Promise<WaitForReceiptOutput> {
        // 1. fast‑path → receipt already in DB?
        try {
            const receipt = await dbService.findReceipt(boopHash)
            if (receipt) return { status: WaitForReceipt.Success, receipt }
        } catch (dbError) {
            logger.error("Error while looking up boop receipt", boopHash, dbError)
            return {
                status: SubmitterError.UnexpectedError,
                error: `Failed to query database for boop status: ${String(dbError)}`,
            }
        }

        boop ??= boopStore.getByHash(boopHash)
        if (!boop) return { status: GetState.UnknownBoop, error: "Unknown boop" }

        // 2. get or create pending boop info
        // biome-ignore format: terse
        const sub = getOrSet(this.#pendingBoopInfos, boopHash, () => ({
            pwr: promiseWithResolvers<WaitForReceiptOutput>(),
            count: 0,
            boop,
            boopHash,
            entryPoint,
            interval: undefined,
            boopGasForEvmTxHash: new Map(),
        }) satisfies PendingBoopInfo)

        // This gets recursively incremented in case of retries, which is perfectly safe.
        sub.count += 1
        sub.entryPoint ??= entryPoint

        // 3. if evmTxInfo supplied and no interval exists, start monitoring for replacement or cancellation
        if (evmTxInfo) this.setActiveEvmTx(sub, evmTxInfo, boop)

        // 4. race the receipt against a timeout
        const output = await Promise.race([
            sub.pwr.promise,
            delayed<WaitForReceiptOutput>(timeout, () => ({
                status: SubmitterError.ReceiptTimeout,
                error: "Timed out while waiting for receipt.",
            })),
        ])

        // 5. clean‑up if no one is subscribed anymore
        if (--sub.count === 0) {
            const evmTxHashes = this.#pendingBoopInfos.get(boopHash)?.boopGasForEvmTxHash?.keys()
            for (const evmTxHash of evmTxHashes ?? []) this.#evmTxHashMap.delete(evmTxHash)
            this.#pendingBoopInfos.delete(boopHash)
        }

        return output
    }

    @TraceMethod("BoopReceiptService.setActiveEvmTx")
    private setActiveEvmTx(sub: PendingBoopInfo, evmTx: EvmTxInfo, boop: Boop | undefined): void {
        sub.latestEvmTx = evmTx
        sub.boopGasForEvmTxHash.set(evmTx.evmTxHash, ifDef(boop, extractFeeInfo))
        this.#evmTxHashMap.set(evmTx.evmTxHash, sub)
        void this.#evmReceiptService
            .waitForReceipt(evmTx.evmTxHash, env.STUCK_TX_WAIT_TIME) //
            .then(({ receipt, cantFetch, timedOut }) => {
                if (receipt) void this.#handleTransactionInBlock(receipt, sub)
                else if (timedOut) void this.replaceOrCancel(sub)
                else if (cantFetch)
                    sub.pwr.resolve({
                        status: SubmitterError.ReceiptTimeout,
                        error: "Transaction receipt could not be fetched after multiple retries",
                    })
            })
    }

    // Note: must be 'private func' not '#func' to be callable and spied on from the tests!
    private async replaceOrCancel(sub: PendingBoopInfo): Promise<void> {
        const tx = sub.latestEvmTx!

        // 1. Retry the transaction once. This won't recursively retry because the interval is unique for the boopHash.
        receiptLogger.info(`Resubmitting Transaction: Boop: ${sub.boopHash}, Previous EVM Tx: ${tx.evmTxHash}`)
        const output = await submitInternal({ boop: sub.boop, entryPoint: sub.entryPoint, replacedTx: tx })
        if (output.status === Onchain.Success) return

        // 2. Retry failed, switch to cancellation.
        receiptLogger.warn(`Retry failed, cancelling: Boop: ${sub.boopHash}, Previous EVM Tx: ${tx.evmTxHash}`, output)
        const account = findExecutionAccount(sub.boop)
        // TODO validate that fees are not above the max
        const partialEvmTxInfo = { nonce: tx.nonce, ...getFees(tx) } satisfies Omit<EvmTxInfo, "evmTxHash">
        try {
            // We identify cancel transaction by making them self-sends.
            const evmTxHash = await walletClient.sendTransaction({
                ...partialEvmTxInfo,
                account,
                to: account.address,
                gas: 21_000n,
            })
            this.setActiveEvmTx(sub, { ...partialEvmTxInfo, evmTxHash }, undefined)
        } catch (error) {
            if (isNonceTooLowError(error)) {
                // A tx with the same nonce landed on chain earlier.
                // This is probably the tx we were trying to replace or cancel.

                // Give the actual included tx some time to be processed.
                await sleep(1000)
                // Then resolve & clear interval. Those will do nothing if
                // we picked up the included tx and processed it already.
                sub.pwr.resolve({
                    status: SubmitterError.ReceiptTimeout,
                    error: "Timed out while waiting for the receipt (nonce too low).",
                })
                clearInterval(sub.interval)
            } else {
                logger.error("Error sending cancel tx", sub.boopHash, error)
            }
        }
    }

    async #handleTransactionInBlock(receipt: TransactionReceipt, sub: PendingBoopInfo): Promise<void> {
        try {
            if (receipt.to === receipt.from) {
                // We identify cancel transactions by making them self-sends.
                // No need to check if the tx was successful (it's 0 self-send, it can't really fail),
                // we only care about the executor address nonce bump.
                sub.pwr.resolve({
                    status: SubmitterError.ReceiptTimeout,
                    error: "The boop was submitted to the mempool but got stuck and was cancelled.",
                })
            } else {
                // Reconstruct boop with fee info matching the EVM tx that landed.
                const gasInfo = sub.boopGasForEvmTxHash.get(receipt.transactionHash)
                if (!gasInfo) throw Error("BUG: missing boop fee info for non-cancel EVM transaction")
                const boop = { ...sub.boop, ...gasInfo }
                sub.pwr.resolve(await this.getReceiptResult(boop, receipt))
            }
        } finally {
            // In principle we don't need the outer `try/finally` statement here
            // as nothing should be able to throw, but better safe than sorry.

            // At this stage, we know that either the boop was included onchain or a cancel transaction
            // for the one carying the boop was included onchain. We don't need the original boop
            // for retries anymore, and it is now safe for the same boop to be resubmitted by users
            // without causing issues (i.e. the PendingBoopInfo will be cleared from the internal
            // maps if it hasn't been already), so we can safely delete the boop from the store.
            boopStore.delete(sub.boop)
            clearInterval(sub.interval)
        }

        // NOTE: In theory, we could resolve the subscription earlier in case of cancellation,
        // as well as delete the boop from the store at that stage. We don't do it, (1) because
        // it makes the code a bit simpler, and (2) because because the negatives are a slightly
        // faster answer and the ability to resubmit the same boop, but since the submitter is
        // suffering (and on that boop in particular (*)), the implied throttling is not a bad thing.
        //
        // (*) In theory, there's nothing a boop can do that would cause us specific trouble, and going to
        // cancellation is normally caused by a chain with full blocks. But the makers of this code are not perfect...
    }

    @TraceMethod("BoopReceiptService.getReceiptResult")
    private async getReceiptResult(boop: Boop, evmTxReceipt: TransactionReceipt): Promise<WaitForReceiptOutput> {
        if (evmTxReceipt.status === "success" && evmTxReceipt.logs?.length)
            return {
                status: WaitForReceipt.Success,
                receipt: this.buildReceipt(boop, evmTxReceipt),
            }

        // TODO? Get the revertData from a log and populate here (instead of "0x")
        //       This is quite difficult to do: it would require tracing the evm transaction in its intra-block
        //       context, which isn't really doable with existing RPCs without a ton of extra logic to setup the proper
        //       state overrides (and not even sure then). If we really want to do this we should probably use TEvm.

        const boopHash = computeHash(boop)
        const decoded = decodeRawError("0x")
        const entryPoint = evmTxReceipt.to! // not a contract deploy, so will be set
        let output = outputForRevertError(entryPoint, boop, boopHash, decoded)
        const simulation = simulationCache.get(boopHash)
        if (
            // detect out-of-gas
            output.status === Onchain.UnexpectedReverted &&
            simulation &&
            simulation.status === Onchain.Success &&
            evmTxReceipt.gasUsed === BigInt(simulation.gas)
        ) {
            output = {
                status: Onchain.EntryPointOutOfGas,
                error:
                    "The boop was included onchain but ran out of gas. If the transaction is self-paying, " +
                    "this can indicate a `payout` function that consumes more gas during execution than during simulation.",
            }
        }
        notePossibleMisbehaviour(boop, output)
        return output
    }

    @TraceMethod("BoopReceiptService.buildReceipt")
    private buildReceipt(boop: Boop, evmTxReceipt: TransactionReceipt): BoopReceipt {
        if (evmTxReceipt.status !== "success") throw new Error("BUG: buildReceipt")
        const boopHash = computeHash(boop)
        const logs = this.filterLogs(evmTxReceipt.logs, boopHash)
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
            description = error.error || "unknown error"
            revertData = error.revertData ?? "0x"
        }

        const receipt = {
            boopHash,
            entryPoint: evmTxReceipt.to as Address, // will be populated, our receipts are not contract deployments
            status,
            logs,
            error: description,
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

    @TraceMethod("BoopReceiptService.filterLogs")
    private filterLogs(logs: Log[], boopHash: Hash): BoopLog[] {
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
