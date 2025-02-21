import { submitterClient } from "#src/clients"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import type { HappyTxState } from "#src/tmp/interface/HappyTxState"
import type { EntryPointStatus } from "#src/tmp/interface/status"
import { computeHappyTxHash } from "#src/utils/getHappyTxHash"
import type { HappyReceiptService } from "./HappyReceiptService"
import type { HappyStateService } from "./HappyStateService"
import type { HappyTransactionService } from "./HappyTransactionService"

export class SubmitterService {
    constructor(
        private happyTransactionService: HappyTransactionService,
        private happyStateService: HappyStateService,
        private happyReceiptService: HappyReceiptService,
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
}
