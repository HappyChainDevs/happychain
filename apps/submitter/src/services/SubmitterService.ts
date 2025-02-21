import { keccak256 } from "viem/utils"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import type { HappyTxState } from "#src/tmp/interface/HappyTxState"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"
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
        const happyTxHash = keccak256(encodeHappyTx(happyTx))

        const resp = await this.happyTransactionService.insert({
            happyTxHash,
            entryPoint,
            ...happyTx,
        })

        if (resp) return resp

        return await this.happyTransactionService.findByHappyTxHash(happyTxHash)
    }

    async finalize(happyTransactionId: number, state: HappyTxState) {
        const { id: happyReceiptId } = state.receipt
            ? await this.happyReceiptService.insertOrThrow(state.receipt)
            : { id: null }

        await this.happyStateService.insert({
            status: state.status as string, // TODO: why the cast
            happyTransactionId,
            happyReceiptId: happyReceiptId as number,
            included: state.included ?? false,
        })
    }
}
