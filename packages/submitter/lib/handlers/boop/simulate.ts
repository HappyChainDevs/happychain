import type { ContentfulStatusCode } from "hono/utils/http-status"
import { zeroAddress } from "viem"
import { parseAccount } from "viem/accounts"
import { Onchain, computeBoopHash } from "#lib/client"
import { publicClient } from "#lib/clients"
import { getSubmitterFee } from "#lib/custom/feePolicy"
import { abis, deployment, env } from "#lib/env"
import { processError } from "#lib/handlers/utils/errorHandling"
import type { OnchainStatus } from "#lib/interfaces/Onchain"
import type { SimulateInput, SimulateOutput } from "#lib/interfaces/boop_simulate"
import { CallStatus } from "#lib/interfaces/contracts"
import { logger } from "#lib/logger"
import { simulationCache } from "#lib/services"
import { encodeBoop } from "#lib/utils/encodeBoop"
import { type BigIntSerialized, serializeBigInt } from "#lib/utils/serializeBigInt"

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
        await Promise.all([simulatePromise, gasPricePromise])

        // TODO inline boop into return value
        const { result: submitOutput } = await simulatePromise
        const gasPrice = await gasPricePromise
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
        // TODO non-standard reverts should be noted
        return processError({ boop, boopHash: "0x", error, simulation: true }) as SimulateOutput
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
