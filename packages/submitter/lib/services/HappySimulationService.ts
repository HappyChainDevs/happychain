import type { Hex } from "viem"
import type { SimulationResult } from "#lib/tmp/interface/SimulationResult"
import { computeHappyTxHash } from "#lib/utils/computeHappyTxHash"
import { decodeHappyTx } from "#lib/utils/decodeHappyTx"
import type { SubmitSimulateResult } from "#lib/utils/simulation-interfaces"
import type { SimulationCacheService } from "./SimulationCacheService"

export class HappySimulationService {
    constructor(private simulationCacheService: SimulationCacheService) {}

    async findResultByHappyTxHash(happyTxHash: Hex): Promise<SimulationResult | undefined> {
        // const result = await this.happySimulationRepository.findByHappyTxHash(happyTxHash)
        return this.simulationCacheService.get(happyTxHash)
    }

    async insertSimulationResult(simulationResult: SubmitSimulateResult): Promise<void> {
        const { request, simulation } = simulationResult.isOk() ? simulationResult.value : simulationResult.error

        if (!simulation) return

        const happyTxHash = computeHappyTxHash(decodeHappyTx(request.args[0]))

        this.simulationCacheService.set(happyTxHash, {
            entryPoint: request.address,
            revertData: simulation.revertData || "0x",
            status: simulation.status,
            validationStatus: simulation.validationStatus,
        } satisfies SimulationResult)
    }
}
