import {
    type Address,
    type Hash,
    type Hex,
    delayed,
    getOrSet,
    ifDef,
    pick,
    promiseWithResolvers,
    tryCatchAsync,
} from "@happy.tech/common"
import type { Log, TransactionReceipt } from "viem"
import { deployment, env } from "#lib/env"
import { outputForExecuteError, outputForRevertError } from "#lib/handlers/errors"
import { GetState } from "#lib/handlers/getState"
import { submitInternal } from "#lib/handlers/submit/submit"
import { WaitForReceipt, type WaitForReceiptOutput } from "#lib/handlers/waitForReceipt"
import { notePossibleMisbehaviour } from "#lib/policies/misbehaviour"
import {
    boopNonceManager,
    boopStore,
    computeHash,
    dbService,
    findExecutionAccount,
    replaceTransaction,
    simulationCache,
} from "#lib/services"
import { TraceMethod } from "#lib/telemetry/traces"
import {
    type Boop,
    type BoopGasInfo,
    type BoopLog,
    type EvmTxInfo,
    Onchain,
    type OnchainStatus,
    SubmitterError,
    extractFeeInfo,
} from "#lib/types"
import { logger, receiptLogger } from "#lib/utils/logger"
import { decodeEvent, decodeRawError, getSelectorFromEventName } from "#lib/utils/parsing"
import type { EvmReceiptService } from "./EvmReceiptService"

const BOOP_EXECUTION_COMPLETED_SELECTOR = getSelectorFromEventName("BoopExecutionCompleted") as Hex
const BOOP_SUBMITTED_SELECTOR = getSelectorFromEventName("BoopSubmitted") as Hex

type PendingBoopInfo = {
    count: number
    boop: Boop
    boopHash: Hash
    entryPoint: Address | undefined
    latestEvmTx?: EvmTxInfo
    boopGasForEvmTxHash: Map<Hash, BoopGasInfo | undefined>
    pwr: PromiseWithResolvers<WaitForReceiptOutput>
    attempt: number
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
            boopGasForEvmTxHash: new Map(),
            attempt: 0
        }) satisfies PendingBoopInfo)

        // This gets recursively incremented in case of retries, which is perfectly safe.
        sub.count += 1
        sub.entryPoint ??= entryPoint

        // 3. if evmTxInfo supplied, start monitoring the receipt
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
                else if (timedOut || cantFetch) void this.replaceOrCancel(sub)
            })
    }

    // Note: must be 'private func' not '#func' to be callable and spied on from the tests!
    private async replaceOrCancel(sub: PendingBoopInfo): Promise<void> {
        const tx = sub.latestEvmTx!

        // 1. Retry the transaction once.
        if (sub.attempt++ === 0) {
            receiptLogger.info(`Resubmitting Transaction: Boop: ${sub.boopHash}, Previous EVM Tx: ${tx.evmTxHash}`)
            const output = await submitInternal({ boop: sub.boop, entryPoint: sub.entryPoint, replacedTx: tx })
            if (output.status === Onchain.Success) return
            const msg = `Retry failed, cancelling: Boop: ${sub.boopHash}, Previous EVM Tx: ${tx.evmTxHash}`
            receiptLogger.warn(msg, output)
        }

        // 2. Retry failed, switch to cancellation.
        boopNonceManager.resetNonce(sub.boop.account, sub.boop.nonceTrack, sub.boop.nonceValue)
        const account = findExecutionAccount(sub.boop)
        await tryCatchAsync(replaceTransaction(account, tx))
        // The try-catch is theoretically unnecessary — just making extra sure.

        // At this point we know the boop was either cancelled or submitted onchain, and — if cancelled —  is now safe
        // to be resubmitted by users without causing issues (i.e. the PendingBoopInfo will be cleared from the internal
        // maps if it hasn't been already), so we can safely delete the boop from the store.
        boopStore.delete(sub.boop)

        // We don't resolve the subscription here, and let it time out instead, since there is still a slim chance that
        // it might be included onchain. While resolving here might enable faster retries, the fact we had to go cancel
        // means that things are busy and the implicit rate limiting here migth be a good thing.
    }

    async #handleTransactionInBlock(receipt: TransactionReceipt, sub: PendingBoopInfo): Promise<void> {
        try {
            // Reconstruct boop with fee info matching the EVM tx that landed.
            const gasInfo = sub.boopGasForEvmTxHash.get(receipt.transactionHash)
            if (!gasInfo) throw Error("BUG: missing boop fee info for non-cancel EVM transaction")
            const boop = { ...sub.boop, ...gasInfo }
            sub.pwr.resolve(await this.getReceiptResult(boop, receipt))
        } finally {
            // In principle we don't need the outer `try/finally` statement here
            // as nothing should be able to throw, but better safe than sorry.

            // At this stage, we know that the boop was included onchain & we don't need it boop for retries anymore.
            boopStore.delete(sub.boop)
        }
    }

    @TraceMethod("BoopReceiptService.getReceiptResult")
    private async getReceiptResult(boop: Boop, evmTxReceipt: TransactionReceipt): Promise<WaitForReceiptOutput> {
        if (evmTxReceipt.status === "success" && evmTxReceipt.logs?.length) {
            boopNonceManager.hintNonce(boop.account, boop.nonceTrack, boop.nonceValue + 1n)
            return this.buildReceipt(boop, evmTxReceipt)
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
    private buildReceipt(boop: Boop, evmTxReceipt: TransactionReceipt): WaitForReceiptOutput {
        if (evmTxReceipt.status !== "success") throw new Error("BUG: buildReceipt")
        const boopHash = computeHash(boop)
        const entryPoint = evmTxReceipt.to! // not a contract deploy, so will be set
        const logs = this.filterLogs(evmTxReceipt.logs, boopHash)

        if (logs === null) {
            const error = "Submitter transaction management issue, please try again."
            return { status: SubmitterError.TransactionManagementError, error }
        }

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

        if (status !== Onchain.Success) notePossibleMisbehaviour(boop, { status, error: description })

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
        return { status: WaitForReceipt.Success, receipt }
    }

    /** Returns the logs pertaining to the boop, or null if the EVM receipt does not match the passed boop hash. */
    @TraceMethod("BoopReceiptService.filterLogs")
    private filterLogs(logs: Log[], boopHash: Hash): BoopLog[] | null {
        let select = false
        const filteredLogs: BoopLog[] = []

        for (const log of logs) {
            const fromEntryPoint = log.address.toLowerCase() === deployment.EntryPoint.toLowerCase()
            if (select && fromEntryPoint && log.topics[0] === BOOP_EXECUTION_COMPLETED_SELECTOR) {
                return filteredLogs
            }
            if (select) {
                filteredLogs.push(pick(log, "address", "topics", "data"))
            } else if (fromEntryPoint && log.topics[0] === BOOP_SUBMITTED_SELECTOR) {
                const decodedLog = decodeEvent(log)
                if (!decodedLog) throw new Error("Found BoopSubmitted event but could not decode")

                const decodedHash = computeHash(decodedLog.args as Boop)
                if (decodedHash === boopHash) select = true
            }
        }
        // biome-ignore format: terse
        if (select) receiptLogger.error( // This should never happen.
            `Boop ${boopHash} has a 'BoopSubmitted' event but no matching 'BoopExecutionCompleted' event in the transaction receipt.`,
        )
        return filteredLogs // will be `null` except in this "should never happen" case
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
