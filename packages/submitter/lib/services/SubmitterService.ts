import { submitterClient } from "#lib/clients"
import { getBaseError } from "#lib/errors/utils"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import type { HappyTxState } from "#lib/tmp/interface/HappyTxState"
import type { EntryPointStatus } from "#lib/tmp/interface/status"
import { computeHappyTxHash } from "#lib/utils/getHappyTxHash"
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

    async finalizeWhenReady(happyTx: HappyTx, persistedTxId: number, txHash: `0x${string}`) {
        const happyTxHash = computeHappyTxHash(happyTx)
        const receipt = await submitterClient.waitForSubmitReceipt({ happyTxHash, happyTx, txHash })
        return await this.finalize(persistedTxId, {
            status: receipt.status as unknown as EntryPointStatus.Success,
            included: Boolean(receipt.txReceipt.transactionHash) as true,
            receipt,
        })
    }

    async insertSimulationSuccess(
        happyTxHash: `0x${string}`,
        request: SubmitContractSimulateParameters,
        result: SubmitContractSimulateReturnType["result"],
    ) {
        return await this.happySimulationService.insertSuccessResult(happyTxHash, request, result)
    }

    async insertSimulationFailure(happyTxHash: `0x${string}`, request: SubmitContractSimulateParameters, err: unknown) {
        const baseError = getBaseError(err)
        const hasRawData = baseError && "raw" in baseError && typeof baseError.raw === "string"
        const data = hasRawData ? (baseError.raw as `0x${string}`) || "0x" : "0x"
        return await this.happySimulationService.insertFailureResult(happyTxHash, request, data)
    }
}
