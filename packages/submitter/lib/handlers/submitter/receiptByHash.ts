import type { Prettify } from "@happy.tech/common"
import { type Result, err, ok } from "neverthrow"
import { DEFAULT_RECEIPT_TIMEOUT_MS } from "#lib/data/defaults"
import { happyReceiptService, happySimulationService } from "#lib/services"
import { type StateRequestOutput, StateRequestStatus } from "#lib/tmp/interface/HappyTxState"
import { EntryPointStatus } from "#lib/tmp/interface/status"
import type { ReceiptInput } from "#lib/tmp/interface/submitter_receipt"

export async function receiptByHash({
    hash,
    timeout,
}: Prettify<ReceiptInput>): Promise<Result<StateRequestOutput, StateRequestOutput>> {
    const receipt = await happyReceiptService.findByHappyTxHashWithTimeout(hash, timeout ?? DEFAULT_RECEIPT_TIMEOUT_MS)
    if (receipt?.status === EntryPointStatus.Success) {
        return ok({
            status: StateRequestStatus.Success,
            state: { status: receipt.status, included: true, receipt: receipt },
        } satisfies StateRequestOutput)
    }

    const simulation = await happySimulationService.findResultByHappyTxHash(hash)

    if (simulation?.status) {
        return ok({
            status: StateRequestStatus.Success,
            state: { status: simulation.status, included: false, simulation },
        } satisfies StateRequestOutput)
    }

    return err({ status: StateRequestStatus.UnknownHappyTx } satisfies StateRequestOutput)
}
