import { type Result, err, ok } from "neverthrow"
import { happyReceiptService, happySimulationService } from "#lib/services"
import { type StateRequestOutput, StateRequestStatus } from "#lib/tmp/interface/HappyTxState"
import { EntryPointStatus } from "#lib/tmp/interface/status"
import type { StateRequestInput } from "#lib/tmp/interface/submitter_state"

export async function stateByHash({
    hash,
}: StateRequestInput): Promise<Result<StateRequestOutput, StateRequestOutput>> {
    const receipt = await happyReceiptService.findByHappyTxHash(hash)

    if (receipt?.status === EntryPointStatus.Success) {
        return ok({
            status: StateRequestStatus.Success,
            state: { status: receipt.status, included: true, receipt: receipt },
        })
    }

    const simulation = await happySimulationService.findResultByHappyTxHash(hash)

    if (simulation?.status) {
        return ok({
            status: StateRequestStatus.Success,
            state: { status: simulation.status, included: false, simulation },
        })
    }

    return err({ status: StateRequestStatus.UnknownHappyTx })
}
