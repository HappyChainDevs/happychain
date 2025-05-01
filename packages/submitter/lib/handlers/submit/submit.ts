import { abis, deployment, env } from "#lib/env"
import { outputForGenericError } from "#lib/handlers/errors"
import { simulate } from "#lib/handlers/simulate"
import { boopNonceManager, submitterService } from "#lib/services"
import { computeBoopHash } from "#lib/services/computeBoopHash"
import { findExecutionAccount } from "#lib/services/evmAccounts"
import { type Boop, Onchain, SubmitterError } from "#lib/types"
import { encodeBoop } from "#lib/utils/boop/encodeBoop"
import { walletClient } from "#lib/utils/clients"
import { logger } from "#lib/utils/logger"
import type { SubmitInput, SubmitOutput } from "./types"

export async function submit(input: SubmitInput): Promise<SubmitOutput> {
    const { entryPoint = deployment.EntryPoint, boop } = input
    const boopHash = computeBoopHash(env.CHAIN_ID, boop, { cache: true })
    try {
        logger.trace("Submitting boop with hash", boopHash)

        // Save original boop to the database for historic purposes and data recovery.
        await submitterService.add(entryPoint, boop, boopHash)

        let simulation = await simulate(input)

        if (simulation.status !== Onchain.Success) {
            return {
                ...simulation,
                stage: "simulate",
            }
        }

        if (simulation.validityUnknownDuringSimulation || simulation.paymentValidityUnknownDuringSimulation) {
            return {
                status: Onchain.ValidationReverted,
                description: "More information needed for the boop to pass validation — most likely a signature.",
                stage: "submit",
            }
        }

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
            gasLimit: simulation.gas, // TODO should probably be lower than the gas limit
            validateGasLimit: simulation.validateGas,
            validatePaymentGasLimit: simulation.paymentValidateGas,
            executeGasLimit: simulation.executeGas,
            maxFeePerGas: simulation.maxFeePerGas,
            submitterFee: simulation.submitterFee,
        } satisfies Boop

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

        boopNonceManager.incrementLocalNonce(boop)
        // TODO save gas values
        // TODO don't monitor unless asked
        submitterService.monitorReceipt(boop, txHash)

        // TODO we need to return way before!
        return {
            status: Onchain.Success,
            hash: boopHash,
            txHash,
            entryPoint: input.entryPoint ?? deployment.EntryPoint,
            gasLimit: updatedBoop.gasLimit,
            validateGasLimit: updatedBoop.validateGasLimit,
            validatePaymentGasLimit: updatedBoop.validatePaymentGasLimit,
            executeGasLimit: updatedBoop.executeGasLimit,
            maxFeePerGas: updatedBoop.maxFeePerGas,
            submitterFee: updatedBoop.submitterFee,
        }
    } catch (error) {
        return {
            ...outputForGenericError(error),
            stage: "submit",
        }
    }
}
