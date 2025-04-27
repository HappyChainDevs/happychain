import { type Result, err, ok } from "neverthrow"
import { type StateRequestOutput, StateRequestStatus } from "#lib/interfaces/BoopState"
import type { StateRequestInput } from "#lib/interfaces/boop_state"
import { Onchain } from "#lib/interfaces/Onchain"
import { boopReceiptService, simulationCache } from "#lib/services"

export async function stateByHash({
    hash,
}: StateRequestInput): Promise<Result<StateRequestOutput, StateRequestOutput>> {
    const receipt = await boopReceiptService.findByBoopHash(hash)

    if (receipt?.status === Onchain.Success) {
        return ok({
            status: StateRequestStatus.Success,
            state: { status: receipt.status, included: true, receipt: receipt },
        })
    }

    const simulation = await simulationCache.findSimulation(hash)

    if (simulation?.status) {
        return ok({
            status: StateRequestStatus.Success,
            // TODO big hack cast for compile
            state: { status: simulation.status as typeof Onchain.Success, included: false, simulation },
        })
    }

    return err({ status: StateRequestStatus.UnknownBoop })
}
