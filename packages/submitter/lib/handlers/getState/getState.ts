import { boopReceiptService, simulationCache } from "#lib/services"
import { GetState, type GetStateInput, type GetStateOutput } from "./types"

export async function getState({ hash }: GetStateInput): Promise<GetStateOutput> {
    // TODO this needs a try-catch for proper error handling, and probably the services need to be more aware of their own errors

    const receipt = await boopReceiptService.find(hash)
    if (receipt) return { status: GetState.Receipt, receipt }

    const simulation = await simulationCache.findSimulation(hash)
    if (simulation) return { status: GetState.Simulated, simulation }

    return { status: GetState.UnknownBoop }
}
