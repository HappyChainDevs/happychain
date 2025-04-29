import { type BigIntSerialized, serializeBigInt } from "@happy.tech/common"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { zeroAddress } from "viem"
import { parseAccount } from "viem/accounts"
import { Onchain, type PartialBoop, computeBoopHash } from "#lib/client"
import { publicClient } from "#lib/clients"
import { getSubmitterFee } from "#lib/custom/feePolicy"
import { abis, deployment, env } from "#lib/env"
import { outputForGenericError, outputForRevertError } from "#lib/handlers/utils/errorHandling"
import type { OnchainStatus } from "#lib/interfaces/Onchain"
import type { SimulateInput, SimulateOutput } from "#lib/interfaces/boop_simulate"
import { CallStatus } from "#lib/interfaces/contracts"
import { logger } from "#lib/logger"
import { getRevertError } from "#lib/parsing"
import { simulationCache } from "#lib/services"
import { encodeBoop } from "#lib/utils/encodeBoop"

export async function simulateFromRoute(
    input: SimulateInput,
): Promise<[BigIntSerialized<SimulateOutput>, ContentfulStatusCode]> {
    const output = await simulate(input)
    // TODO do better, maybe other successful statuses, better http codes
    return output.status === Onchain.Success
        ? ([serializeBigInt(output), 200] as const)
        : ([serializeBigInt(output), 422] as const)
}

export async function simulate({ entryPoint = deployment.EntryPoint, boop }: SimulateInput): Promise<SimulateOutput> {
    const boopHash = computeBoopHash(env.CHAIN_ID, boop)
    logger.trace("Simulating boop", boopHash, boop)
    const encodedBoop = encodeBoop(boop)
    try {
        const simulatePromise = publicClient.simulateContract({
            address: entryPoint,
            args: [encodedBoop],
            account: parseAccount(zeroAddress),
            abi: abis.EntryPoint,
            functionName: "submit",
        })
        const gasPricePromise = publicClient.getGasPrice()
        // TODO make sure nonce is gucci / prefetched?
        // TODO inline boop into return value
        const [{ result: submitOutput }, gasPrice] = await Promise.all([simulatePromise, gasPricePromise])
        const status = getEntryPointStatusFromCallStatus(submitOutput.callStatus)

        // biome-ignore format: pretty
        const output = status === Onchain.Success
            ? {
                ...submitOutput,
                status,
                gas: boop.gasLimit || applyGasMargin(submitOutput.gas),
                validateGas: boop.validateGasLimit || applyGasMargin(submitOutput.validateGas),
                paymentValidateGas: boop.validatePaymentGasLimit || applyGasMargin(submitOutput.validateGas),
                executeGas: boop.executeGasLimit || applyGasMargin(submitOutput.executeGas),
                maxFeePerGas: gasPrice,
                submitterFee: getSubmitterFee(boop),
            } : {
                status,
                revertData: submitOutput.revertData,
            }

        await simulationCache.insertSimulation({ entryPoint, boop }, output)
        logger.trace("finished simulation with output", output)
        return output
    } catch (error) {
        const revert = getRevertError(error)
        const output = revert.isContractRevert
            ? outputForRevertError(boop, boopHash, revert)
            : outputForGenericError(error)
        noteSimulationMisbehaviour(boop, output)
        return output
    }
}

function applyGasMargin(value: number): number {
    return Math.floor((value * env.GAS_SAFETY_MARGIN) / 100)
}

function getEntryPointStatusFromCallStatus(callStatus: number): OnchainStatus {
    switch (callStatus) {
        case CallStatus.SUCCEEDED:
            return Onchain.Success
        case CallStatus.CALL_REVERTED:
            return Onchain.CallReverted
        case CallStatus.EXECUTE_FAILED:
            return Onchain.ExecuteRejected
        case CallStatus.EXECUTE_REVERTED:
            return Onchain.ExecuteReverted
        default:
            throw new Error(`implementation error: unknown call status: ${callStatus}`)
    }
}

// TODO fill in
export function noteSimulationMisbehaviour(_boop: PartialBoop, output: SimulateOutput): void {
    switch (output.status) {
        case Onchain.ValidationReverted:
        // Note the account as suspicious: validation is never supposed to revert during validation, only return
        // encoded errors. It's also supposed to not use more gas during validation than it does during execution.
        case Onchain.PaymentValidationReverted:
        // Note the paymaster as suspicious: validation is never supposed to revert during validation, only return
        // encoded errors. It's also supposed to not use more gas during validation than it does during execution.
        case Onchain.InsufficientStake:
        // Note the paymaster as insufficiently staked. This is not necessarily a sign of misbehaviour, but can be used
        // as a policy parameter to deprioritize paymasters that have been known to let their stake slip.
        case Onchain.UnexpectedReverted:
        /** cf. docstring of {@link Onchain.UnexpectedReverted}, this is indicative of an implementation or
         ** configuration problem. We already log this in {@link outputForRevertError}. */

        // default: // commented out to avoid linting issues
        // Here we can increment some global failure counter, which can help us deprioritize
        // sessions (if we decided to add them!) that tend to have a high failure ratio.
    }
}
