import { deployment } from "#lib/env"
import { boopReceiptService, simulationCache } from "#lib/services"
import { GetState, type GetStateInput, type GetStateOutput } from "./types"

export async function getState(input: GetStateInput): Promise<GetStateOutput> {
    const hash = input.hash
    const entryPoint = input.entryPoint ?? deployment.EntryPoint

    // TODO this needs a try-catch for proper error handling, and probably the services need to be more aware of their own errors

    const receipt = await boopReceiptService.find(hash)
    if (receipt) return { status: GetState.Receipt, receipt }

    const simulation = await simulationCache.findSimulation(entryPoint, hash)
    if (simulation) return { status: GetState.Simulated, simulation }

    return { status: GetState.UnknownBoop }
}
