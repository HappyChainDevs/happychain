import type { happyChainSepolia } from "@happy.tech/wallet-common"
import type { Hex, SimulateContractParameters } from "viem"
import type { Account } from "viem/accounts"
import type { SimulateContractReturnType } from "viem/actions"
import type { HappySimulation } from "#lib/database/generated"
import type { HappySimulationRepository } from "#lib/database/repositories/HappySimulationRepository"
import type { abis } from "#lib/deployments"
import { decodeRawError, getSelectorFromErrorName } from "#lib/errors/parsedCodes"
import type { SimulationResult } from "#lib/tmp/interface/SimulationResult"
import { EntryPointStatus, SimulatedValidationStatus, isFailure, isRevert } from "#lib/tmp/interface/status"

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

// From HappyEntryPoint.sol
const CallStatusTable: Record<number, EntryPointStatus> = {
    0: EntryPointStatus.Success, // The call succeeded.
    1: EntryPointStatus.UnexpectedReverted, // The call reverted. TODO: CALL_REVERTED
    2: EntryPointStatus.ExecuteReverted, // The {IHappyAccount.execute} function reverted (in violation of the spec).
}
function getCallStatus(status: number) {
    if (CallStatusTable[status]) return CallStatusTable[status]
    throw new Error(`Unknown Call Status: ${status}`)
}

export class HappySimulationService {
    constructor(private happySimulationRepository: HappySimulationRepository) {}

    async findResultByHappyTxHash(happyTxHash: Hex): Promise<SimulationResult | undefined> {
        const result = await this.happySimulationRepository.findByHappyTxHash(happyTxHash)
        if (!result) return result
        return this.getSimulationResult(result)
    }

    async insert(newHappyState: Omit<HappySimulation, "id">): Promise<HappySimulation | undefined> {
        return await this.happySimulationRepository.insert(newHappyState)
    }

    async insertSuccessResult(
        happyTxHash: `0x${string}`,
        request: SubmitContractSimulateParameters,
        result: SubmitContractSimulateReturnType["result"],
    ) {
        // Store simulation result if happyTxHash is provided
        const status = getCallStatus(result.callStatus)
        const validationStatus =
            Number(result.validationStatus) === 0
                ? SimulatedValidationStatus.Success
                : result.validationStatus === getSelectorFromErrorName("UnknownDuringSimulation")
                  ? SimulatedValidationStatus.Unknown
                  : result.validationStatus === getSelectorFromErrorName("FutureNonceDuringSimulation")
                    ? SimulatedValidationStatus.FutureNonce
                    : ""

        const inserted = await this.insert({
            happyTxHash,
            entryPoint: request.address,
            executeGas: BigInt(result.executeGas),
            gas: BigInt(result.gas),
            failureReason: "0x",
            revertData: result.revertData || "0x",
            status,
            validationStatus,
        })

        return this.getSimulationResult(inserted)
    }

    async insertFailureResult(
        happyTxHash: `0x${string}`,
        request: SubmitContractSimulateParameters,
        errData: `0x${string}`,
    ) {
        const decoded = decodeRawError(errData)
        const inserted = await this.insert({
            happyTxHash,
            entryPoint: request.address,
            executeGas: 0n,
            gas: 0n,
            failureReason: getSelectorFromErrorName(decoded.errorName) || "0x",
            revertData: decoded.args[0] || "0x",
            // TODO: this statuses isn't correct
            // TODO: proper lookup or conversion - how to determine these>
            status: EntryPointStatus.PaymentReverted,
            validationStatus: decoded.errorName.endsWith("Reverted")
                ? SimulatedValidationStatus.Reverted
                : SimulatedValidationStatus.Failed,
        })

        return this.getSimulationResult(inserted)
    }

    private getSimulationResult(
        sim?:
            | Pick<HappySimulation, "entryPoint" | "revertData" | "failureReason" | "status" | "validationStatus">
            | undefined,
    ) {
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
                failureReason: sim.failureReason,
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
