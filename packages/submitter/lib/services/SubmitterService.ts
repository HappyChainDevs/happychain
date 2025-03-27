import { submitterClient } from "#lib/clients"
import { getBaseError } from "#lib/errors/utils"
import { logger } from "#lib/logger"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import type { HappyTxState } from "#lib/tmp/interface/HappyTxState"
import type { EntryPointStatus } from "#lib/tmp/interface/status"
import { computeHappyTxHash } from "#lib/utils/computeHappyTxHash.ts"
import { decodeHappyTx } from "#lib/utils/decodeHappyTx"
import type { HappyReceiptService } from "./HappyReceiptService"
import type {
    HappySimulationService,
    SubmitContractSimulateParameters,
    SubmitContractSimulateReturnType,
} from "./HappySimulationService"
import type { HappyStateService } from "./HappyStateService"
import type { HappyTransactionService } from "./HappyTransactionService"

export class SubmitterService {
    constructor(
        private happyTransactionService: HappyTransactionService,
        private happyStateService: HappyStateService,
        private happyReceiptService: HappyReceiptService,
        private happySimulationService: HappySimulationService,
    ) {}

    async initialize(entryPoint: `0x${string}`, happyTx: HappyTx) {
        const happyTxHash = computeHappyTxHash(happyTx)
        await this.happyTransactionService.insert({ happyTxHash, entryPoint, ...happyTx })
    }

    async finalize(happyTransactionId: number, state: HappyTxState) {
        const { id: happyReceiptId } = state.receipt
            ? await this.happyReceiptService.insertOrThrow(state.receipt)
            : { id: null }

        await this.happyStateService.insert({
            status: state.status,
            happyTransactionId,
            happyReceiptId: happyReceiptId as number,
            included: state.included ?? false,
        })
    }

    async finalizeWhenReady(happyTx: HappyTx, txHash: `0x${string}`) {
        try {
            const happyTxHash = computeHappyTxHash(happyTx)
            const persisted = await this.happyTransactionService.findByHappyTxHash(happyTxHash)
            if (!persisted?.id) {
                const logData = { txHash, happyTxHash, happyTx }
                logger.warn("Persisted HappyTx not found. Could not finalize.", logData)
                return
            }
            const receipt = await submitterClient.waitForSubmitReceipt({ happyTxHash, txHash })
            return await this.finalize(persisted.id, {
                status: receipt.status as unknown as EntryPointStatus.Success,
                included: Boolean(receipt.txReceipt.transactionHash) as true,
                receipt,
            })
        } catch (err) {
            logger.warn("Error while finalizing HappyTx", err)
        }
    }

    async insertSimulationSuccess(
        request: SubmitContractSimulateParameters,
        result: SubmitContractSimulateReturnType["result"],
    ) {
        const happyTxHash = computeHappyTxHash(decodeHappyTx(request.args[0]))
        return await this.happySimulationService.insertSuccessResult(happyTxHash, request, result)
    }

    async insertSimulationReverted(request: SubmitContractSimulateParameters, err: unknown) {
        const happyTxHash = computeHappyTxHash(decodeHappyTx(request.args[0]))
        const baseError = getBaseError(err)

        const hasRawData = baseError && "raw" in baseError && typeof baseError.raw === "string"
        const data = hasRawData ? (baseError.raw as `0x${string}`) || "0x" : "0x"

        return await this.happySimulationService.insertRevertedResult(happyTxHash, request, data)
    }

    async insertSimulation(
        request: SubmitContractSimulateParameters,
        result?: SubmitContractSimulateReturnType["result"] | undefined,
        error?: unknown | undefined,
    ) {
        if (request && result) {
            return await this.insertSimulationSuccess(request, result)
        } else if (request && !result) {
            return await this.insertSimulationReverted(request, error)
        }
        throw new Error("Invalid parameters for insertSimulation")
    }
}
