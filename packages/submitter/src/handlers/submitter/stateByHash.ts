import { happyReceiptService, happySimulationService } from "#src/services"
import { type StateRequestOutput, StateRequestStatus } from "#src/tmp/interface/HappyTxState"
import { EntryPointStatus } from "#src/tmp/interface/status"
import type { StateRequestInput } from "#src/tmp/interface/submitter_state"

export async function stateByHash({ hash }: StateRequestInput): Promise<StateRequestOutput> {
    const receipt = await happyReceiptService.findByHappyTxHash(hash)

    if (receipt?.status === EntryPointStatus.Success) {
        return {
            status: StateRequestStatus.Success,
            state: { status: receipt.status, included: true, receipt: receipt },
        }
    }

    const simulation = await happySimulationService.findResultByHappyTxHash(hash)

    if (simulation?.status) {
        return {
            status: StateRequestStatus.Success,
            state: { status: simulation.status, included: false, simulation },
        }
    }

    return { status: StateRequestStatus.UnknownHappyTx }
}
