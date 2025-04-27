import type { ContentfulStatusCode } from "hono/utils/http-status"
import { walletClient } from "#lib/clients"
import { abis, deployment, env } from "#lib/env"
import { processError } from "#lib/handlers/utils/errorHandling"
import { Onchain } from "#lib/interfaces/Onchain"
import { SubmitterError } from "#lib/interfaces/SubmitterError"
import type { SimulateInput, SimulateOutput } from "#lib/interfaces/boop_simulate"
import type { SubmitInput, SubmitOutput } from "#lib/interfaces/boop_submit"
import { logger } from "#lib/logger"
import { boopNonceManager, submitterService } from "#lib/services"
import { computeBoopHash } from "#lib/utils/computeBoopHash"
import { encodeBoop } from "#lib/utils/encodeBoop"
import { findExecutionAccount } from "#lib/utils/findExecutionAccount"
import { type BigIntSerialized, serializeBigInt } from "#lib/utils/serializeBigInt"
import { simulate } from "./simulate"

export async function submitFromRoute(
    input: SimulateInput,
): Promise<[BigIntSerialized<SubmitOutput>, ContentfulStatusCode]> {
    const output = await submit(input)
    // TODO do better, maybe other successful statuses, better http codes
    return output.status === Onchain.Success
        ? ([serializeBigInt(output), 200] as const)
        : ([serializeBigInt(output), 422] as const)
}

export async function submit(input: SubmitInput): Promise<SubmitOutput> {
    const { entryPoint = deployment.EntryPoint, boop } = input
    const boopHash = computeBoopHash(env.CHAIN_ID, boop, { cache: true })
    try {
        logger.trace("Submitting boop with hash", boopHash)

        // Save original tx to the database for historic purposes and data recovery.
        await submitterService.initialize(entryPoint, boop, boopHash)

        let simulation = await simulate(input)

        if (simulation.status !== Onchain.Success) return { ...simulation, stage: "simulate" }

        // If future nonce, wait until ready.
        const isFutureNonce = simulation.futureNonceDuringSimulation
        if (isFutureNonce && (await boopNonceManager.checkIfBlocked(entryPoint, boop))) {
            logger.trace("boop has future nonce, waiting until it becomes unblocked", boopHash)
            const resp = await boopNonceManager.pauseUntilUnblocked(entryPoint, boop)
            logger.trace("boop unblocked", boopHash)
            if (resp.isErr())
                return {
                    // TODO pauseUntilBlocked should provide this object
                    status: SubmitterError.UnexpectedError,
                    description: resp.error.message,
                    stage: "submit",
                }
            simulation = await simulate(input) // update simulation
            if (simulation.status !== Onchain.Success) return { ...simulation, stage: "simulate" }
        }

        const account = findExecutionAccount(input.boop)
        logger.trace("Submitting to the chain using execution account", account.address, boopHash)

        // TODO make simulate return an updated boop
        const updatedBoop = {
            ...input.boop,
            gas: simulation.gas, // TODO should probably be lower than the gas limit
            validateGas: simulation.validateGas,
            paymentValidateGas: simulation.paymentValidateGas,
            executeGas: simulation.executeGas,
            maxFeePerGas: simulation.maxFeePerGas,
            submitterFee: simulation.submitterFee,
        }

        // TODO make sure this does no extra needless simulations
        const txHash = await walletClient.writeContract({
            address: input.entryPoint ?? deployment.EntryPoint,
            args: [encodeBoop(updatedBoop)],
            abi: abis.EntryPoint,
            functionName: "submit",
            gas: BigInt(simulation.gas),
            maxFeePerGas: simulation.maxFeePerGas,
            maxPriorityFeePerGas: 1n,
            account,
        })
        logger.trace("Successfully submitted", boopHash, txHash)

        // TODO does this need the updatd boop instead?
        boopNonceManager.incrementLocalNonce(boop)
        submitterService.finalizeWhenReady(boop, txHash)

        // TODO we need to return way before!
        return {
            status: Onchain.Success,
            hash: boopHash,
            txHash,
        }
    } catch (error) {
        return {
            ...(processError({ boop, boopHash, error }) as SimulateOutput),
            stage: "submit", // simulation failures are caught in the `simulate` call
        } as SubmitOutput
        // TODO if refactoring, might get be able to get rid of this cast (needs to know it will only get SubmitError-compatible statuses)
    }
}
