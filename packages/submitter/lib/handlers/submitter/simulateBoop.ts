import { err, ok } from "neverthrow"
import { zeroAddress } from "viem"
import { parseAccount } from "viem/accounts"
import { publicClient } from "#lib/clients"
import { abis } from "#lib/deployments"
import { happySimulationService } from "#lib/services/index"
import { getSimulationError } from "#lib/utils/getSimulationError"
import { getSimulationResult } from "#lib/utils/getSimulationResult"
import type { SubmitParameters, SubmitRequest, SubmitSimulateResult } from "#lib/utils/simulation-interfaces"
import { updateGasValues } from "#lib/utils/updateGasValues"

/**
 *
 * @param parameters { address, args, account }
 * @param parameters.address The address of the entrypoint
 * @param parameters.args The encoded happyTx
 * @param parameters.account The execution wallet
 * @returns Result<{ request, result, simulation }, Error>
 */
export async function simulateBoop(
    entryPoint: `0x${string}`,
    encodedBoop: `0x${string}`,
): Promise<SubmitSimulateResult> {
    const simulationResult = await simulateContract(entryPoint, encodedBoop)

    await happySimulationService.insertSimulationResult(simulationResult)

    if (simulationResult.isErr()) return simulationResult

    const updatedBoop = updateGasValues(encodedBoop, simulationResult.value.result)

    return ok({
        request: { address: entryPoint, args: [updatedBoop] } satisfies SubmitParameters,
        result: simulationResult.value.result,
        simulation: simulationResult.value.simulation,
    })
}

/**
 * Simulates the contract call using Viem, then parses the SimulationResult,
 * and returns it alongside the { request, result } from viem. in the event it reverts
 * result will be undefined, and SimulationResult will parse the revert data.
 * Boops are always simulated with the zero address as tx.origin.
 */
async function simulateContract(entryPoint: `0x${string}`, encodedBoop: `0x${string}`): Promise<SubmitSimulateResult> {
    const boopParameters = { address: entryPoint, args: [encodedBoop] } satisfies SubmitParameters

    try {
        const { request, result } = await publicClient.simulateContract({
            address: boopParameters.address,
            args: boopParameters.args,
            account: parseAccount(zeroAddress),
            abi: abis.HappyEntryPoint,
            functionName: "submit",
        } satisfies SubmitRequest)
        const simulation = getSimulationResult(request, result)

        // if simulation wasn't successful, we won't attempt to execute
        if (result?.callStatus === 0 && simulation) return ok({ request: boopParameters, result, simulation })

        return err({ request: boopParameters, result, simulation })
    } catch (_err) {
        return err({
            request: boopParameters,
            result: undefined,
            simulation: getSimulationError(boopParameters, _err),
        })
    }
}
