import type { Prettify } from "@happy.tech/common"
import { happyReceiptService, happySimulationService } from "#lib/services"
import { type StateRequestOutput, StateRequestStatus } from "#lib/tmp/interface/HappyTxState"
import { EntryPointStatus } from "#lib/tmp/interface/status"
import type { ReceiptInput } from "#lib/tmp/interface/submitter_receipt"

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

    const simulation = await happySimulationService.findResultByHappyTxHash(hash)

    if (simulation?.status) {
        return {
            status: StateRequestStatus.Success,
            state: { status: simulation.status, included: false, simulation },
        } satisfies StateRequestOutput
    }

    return { status: StateRequestStatus.UnknownHappyTx } satisfies StateRequestOutput
}
