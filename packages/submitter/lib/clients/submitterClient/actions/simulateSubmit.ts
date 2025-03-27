import type { happyChainSepolia } from "@happy.tech/wallet-common"
import type { Account, Prettify, SimulateContractParameters, SimulateContractReturnType } from "viem"
import { zeroAddress } from "viem"
import { parseAccount } from "viem/accounts"
import { publicClient } from "#lib/clients"
import { abis } from "#lib/deployments"
import { UnknownError } from "#lib/errors"
import { SimulationError } from "#lib/errors/contract-errors"
import { parseFromViemError } from "#lib/errors/utils"
import { logger } from "#lib/logger"
import { submitterService } from "#lib/services"
import type { SimulationResult } from "#lib/tmp/interface/SimulationResult"
import { decodeHappyTx } from "#lib/utils/decodeHappyTx"
import { encodeHappyTx } from "#lib/utils/encodeHappyTx"
import { AccountNotFoundError } from "../errors"

/**
 * Simulates the contract call. In the event it reverts, it formats as simulationResults,
 * saves to the db, then re-throws the error.
 */
async function simulateContract(req: SubmitSimulateParameters) {
    try {
        const { request, result } = await publicClient.simulateContract(req)
        return { request, result }
    } catch (_err) {
        // Unhandled Code revert during simulation!
        const sim = await submitterService.insertSimulation(req, undefined, _err)

        if (sim) throw new SimulationError(sim)
        logger.warn("Failed in save simulation result", { error: _err })
        // @ts-expect-error
        throw parseFromViemError(_err) || new UnknownError(_err?.message || "Failed to simulate contract")
    }
}

/**
 *
 * @param parameters { address, args, account }
 * @param parameters.address The address of the entrypoint
 * @param parameters.args The encoded happyTx
 * @param parameters.account The execution wallet
 * @returns { request, result, simulation }
 *
 * @throws SimulationError if the simulation reverts and the call would not be able to continue
 */
export async function simulateSubmit(
    parameters: Omit<SubmitSimulateParameters, "abi" | "functionName">,
): Promise<SubmitSimulateReturnType> {
    if (!parameters.account) throw new AccountNotFoundError("simulateSubmit")
    const requestAccount = parseAccount(parameters.account)
    // Simulate with zero address to allow for future nonce simulation
    const account = parseAccount(zeroAddress)

    const params = {
        ...parameters,
        account,
        abi: abis.HappyEntryPoint,
        functionName: "submit",
    } as SubmitSimulateParameters

    const { request, result } = await simulateContract(params)

    // Note: simulation success could still result in execution error!
    const simulation = await submitterService.insertSimulation(params, result)

    logger.warn("Failed in save simulation result")

    if (simulation && result.callStatus !== 0) throw new SimulationError(simulation)

    // Update gas limits for the encoded tx if they where previously 0
    const decoded = decodeHappyTx(request.args[0])

    const hasSuccessfulGasEstimation = Boolean(result.gas && result.executeGas)
    const needsPaymasterGasFilled = Boolean(
        decoded.paymaster !== decoded.account && !decoded.gasLimit && !decoded.executeGasLimit,
    )

    if (needsPaymasterGasFilled && hasSuccessfulGasEstimation) {
        decoded.gasLimit = BigInt(result.gas) * 10n // TODO: contract simulation gas estimation errors
        decoded.executeGasLimit = BigInt(result.executeGas) * 10n // TODO: this shouldn't need the * 10n
    }

    return {
        // restore original account, instead of zeroAddress which was used
        request: {
            ...request,
            // potentially updated gas values
            args: [encodeHappyTx(decoded)],
            // original requesting account
            account: requestAccount,
        } as unknown as typeof request,
        result,
        simulation,
    }
}

type SubmitSimulateParameters = SimulateContractParameters<
    typeof abis.HappyEntryPoint,
    "submit",
    readonly [`0x${string}`],
    typeof happyChainSepolia,
    undefined,
    Account
>

type SubmitSimulateReturnType = Prettify<
    SimulateContractReturnType<
        typeof abis.HappyEntryPoint,
        "submit",
        readonly [`0x${string}`],
        typeof happyChainSepolia,
        undefined,
        undefined,
        Account
    > & { simulation?: SimulationResult | undefined }
>
