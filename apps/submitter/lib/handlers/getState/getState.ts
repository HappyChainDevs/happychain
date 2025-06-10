import { trace } from "@opentelemetry/api"
import { outputForGenericError } from "#lib/handlers/errors"
import { boopStore, dbService, simulationCache } from "#lib/services"
import { traceFunction } from "#lib/telemetry/traces"
import { GetState, type GetStateInput, type GetStateOutput } from "./types"

async function getState(input: GetStateInput): Promise<GetStateOutput> {
    try {
        const boopHash = input.boopHash
        const activeSpan = trace.getActiveSpan()
        activeSpan?.setAttribute("boopHash", boopHash)
        const receipt = await dbService.findReceipt(boopHash)
        if (receipt) return { status: GetState.Receipt, receipt }
        const simulation = await simulationCache.get(boopHash)
        if (simulation) return { status: GetState.Simulated, simulation }
        const boop = boopStore.getByHash(boopHash)
        if (!boop) return { status: GetState.UnknownBoop, error: "Unknown boop." }
        return {
            status: GetState.UnknownState,
            error: "The boop is known, but there is no receipt or simulation data to serve.",
        }
    } catch (error) {
        return outputForGenericError(error)
    }
}

const tracedGetState = traceFunction(getState, "getState")

export { tracedGetState as getState }
