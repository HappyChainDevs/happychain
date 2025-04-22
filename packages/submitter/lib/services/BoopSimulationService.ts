import type { Hex } from "viem"
import { env } from "#lib/env"
import type { SimulationResult } from "#lib/tmp/interface/SimulationResult"
import { computeBoopHash } from "#lib/utils/computeBoopHash"
import { decodeBoop } from "#lib/utils/decodeBoop"
import type { SubmitSimulateResult } from "#lib/utils/simulation-interfaces"
import type { SimulationCacheService } from "./SimulationCacheService"

/**
 * Fetches and Saves Simulation Results
 */
export class BoopSimulationService {
    constructor(private simulationCacheService: SimulationCacheService) {}

    async findResultByBoopHash(boopHash: Hex): Promise<SimulationResult | undefined> {
        return this.simulationCacheService.get(boopHash)
    }

    async insertSimulationResult(simulationResult: SubmitSimulateResult): Promise<void> {
        const { request, simulation } = simulationResult.isOk() ? simulationResult.value : simulationResult.error

        if (!simulation) return

        const boopHash = computeBoopHash(BigInt(env.CHAIN_ID), decodeBoop(request.args[0]))

        this.simulationCacheService.set(boopHash, {
            entryPoint: request.address,
            revertData: simulation.revertData || "0x",
            status: simulation.status,
            validationStatus: simulation.validationStatus,
        } satisfies SimulationResult)
    }
}
