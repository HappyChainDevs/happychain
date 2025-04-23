import { type Result, err, ok } from "neverthrow"
import { type StateRequestOutput, StateRequestStatus } from "#lib/interfaces/BoopState"
import type { StateRequestInput } from "#lib/interfaces/boop_state"
import { EntryPointStatus } from "#lib/interfaces/status"
import { boopReceiptService, boopSimulationService } from "#lib/services"

export async function stateByHash({
    hash,
}: StateRequestInput): Promise<Result<StateRequestOutput, StateRequestOutput>> {
    const receipt = await boopReceiptService.findByBoopHash(hash)

    if (receipt?.status === EntryPointStatus.Success) {
        return ok({
            status: StateRequestStatus.Success,
            state: { status: receipt.status, included: true, receipt: receipt },
        })
    }

    const simulation = await boopSimulationService.findResultByBoopHash(hash)

    if (simulation?.status) {
        return ok({
            status: StateRequestStatus.Success,
            state: { status: simulation.status, included: false, simulation },
        })
    }

    return err({ status: StateRequestStatus.UnknownBoop })
}
