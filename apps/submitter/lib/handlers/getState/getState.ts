import { deployment } from "#lib/env"
import { outputForGenericError } from "#lib/handlers/errors"
import { dbService, simulationCache } from "#lib/services"
import { GetState, type GetStateInput, type GetStateOutput } from "./types"

export async function getState(input: GetStateInput): Promise<GetStateOutput> {
    try {
        const hash = input.boopHash
        const entryPoint = input.entryPoint ?? deployment.EntryPoint
        const { receipt, boop } = await dbService.findReceiptOrBoop(hash)
        if (receipt) return { status: GetState.Receipt, receipt }
        const simulation = await simulationCache.findSimulation(entryPoint, hash)
        if (simulation) return { status: GetState.Simulated, simulation }
        if (!boop) return { status: GetState.UnknownBoop, description: "Unknown boop." }
        return {
            status: GetState.UnknownState,
            description: "The boop is known, but there is no receipt or simulation data to serve.",
        }
    } catch (error) {
        return outputForGenericError(error)
    }
}
