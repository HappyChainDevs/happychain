import type { happyChainSepolia } from "@happy.tech/wallet-common"
import type { Hex, SimulateContractParameters } from "viem"
import type { Account } from "viem/accounts"
import type { SimulateContractReturnType } from "viem/actions"
import type { HappySimulation } from "#lib/database/generated"
import type { HappySimulationRepository } from "#lib/database/repositories/HappySimulationRepository"
import type { abis } from "#lib/deployments"
import type { SimulationResult } from "#lib/tmp/interface/SimulationResult"
import { EntryPointStatus, type SimulatedValidationStatus, isFailure, isRevert } from "#lib/tmp/interface/status"

export type SubmitContractSimulateParameters<account extends Account = Account> = SimulateContractParameters<
    typeof abis.HappyEntryPoint,
    "submit",
    readonly [`0x${string}`],
    typeof happyChainSepolia,
    typeof happyChainSepolia,
    account
>
export type SubmitContractSimulateReturnType<account extends Account = Account> = SimulateContractReturnType<
    typeof abis.HappyEntryPoint,
    "submit",
    readonly [`0x${string}`],
    typeof happyChainSepolia,
    account,
    typeof happyChainSepolia,
    account
>

export class HappySimulationService {
    constructor(private happySimulationRepository: HappySimulationRepository) {}

    async findResultByHappyTxHash(happyTxHash: Hex): Promise<SimulationResult | undefined> {
        const result = await this.happySimulationRepository.findByHappyTxHash(happyTxHash)
        return this.convertSimulationResult(result)
    }

    async insert(newHappyState: Omit<HappySimulation, "id">): Promise<HappySimulation | undefined> {
        return await this.happySimulationRepository.insert(newHappyState)
    }

    async insertSimulationResult(
        happyTxHash: `0x${string}`,
        request: SubmitContractSimulateParameters,
        result: SubmitContractSimulateReturnType["result"] | undefined,
        simulation: SimulationResult | undefined,
    ): Promise<void> {
        if (!simulation) return
        await this.insert({
            happyTxHash,
            entryPoint: request.address,
            executeGas: BigInt(result?.executeGas ?? 0n),
            gas: BigInt(result?.gas ?? 0n),
            revertData: simulation.revertData || "0x",
            status: simulation.status,
            validationStatus: simulation.validationStatus,
        })
    }

    private convertSimulationResult(
        sim?: Pick<HappySimulation, "entryPoint" | "revertData" | "status" | "validationStatus"> | undefined,
    ): SimulationResult | undefined {
        if (!sim) return
        const status = sim.status as EntryPointStatus

        if (status === EntryPointStatus.Success) {
            return {
                status,
                entryPoint: sim.entryPoint,
                validationStatus: sim.validationStatus as SimulatedValidationStatus,
            } satisfies SimulationResult
        }

        if (isFailure(status)) {
            return {
                revertData: sim.revertData,
                entryPoint: sim.entryPoint,
                status,
                validationStatus: sim.validationStatus as SimulatedValidationStatus,
            } satisfies SimulationResult
        }

        if (isRevert(status)) {
            return {
                revertData: sim.revertData,
                entryPoint: sim.entryPoint,
                status,
                validationStatus: sim.validationStatus as SimulatedValidationStatus,
            } satisfies SimulationResult
        }
    }
}
