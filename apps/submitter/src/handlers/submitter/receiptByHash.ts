import type { Prettify } from "@happy.tech/common"
import { happyReceiptService } from "#src/services"
import { type StateRequestOutput, StateRequestStatus } from "#src/tmp/interface/HappyTxState"
import { EntryPointStatus } from "#src/tmp/interface/status"
import type { ReceiptInput } from "#src/tmp/interface/submitter_receipt"

export async function receiptByHash({
    hash,
    timeout,
}: Prettify<ReceiptInput & { timeout: number }>): Promise<StateRequestOutput> {
    const receipt = await happyReceiptService.findByHappyTxHashWithTimeout(hash, timeout)
    if (receipt?.status === EntryPointStatus.Success) {
        return {
            status: StateRequestStatus.Success,
            state: { status: receipt.status, included: true, receipt: receipt },
        } satisfies StateRequestOutput
    }

    return { status: StateRequestStatus.UnknownHappyTx } satisfies StateRequestOutput
}
