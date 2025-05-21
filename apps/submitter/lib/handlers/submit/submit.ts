import type { Hash } from "@happy.tech/common"
import { abis, deployment } from "#lib/env"
import { outputForGenericError } from "#lib/handlers/errors"
import { simulate } from "#lib/handlers/simulate"
import type { WaitForReceiptOutput } from "#lib/handlers/waitForReceipt"
import { boopNonceManager, computeHash, dbService, receiptService } from "#lib/services"
import { findExecutionAccount } from "#lib/services/evmAccounts"
import { Onchain } from "#lib/types"
import { encodeBoop } from "#lib/utils/boop/encodeBoop"
import { updateBoopFromSimulation } from "#lib/utils/boop/updateBoopFromSimulation"
import { walletClient } from "#lib/utils/clients"
import { logger } from "#lib/utils/logger"
import type { SubmitInput, SubmitOutput } from "./types"

export async function submit(input: SubmitInput): Promise<SubmitOutput> {
    const { txHash, receiptPromise, ...output } = await submitInternal(input, true)
    return output
}

export async function submitInternal(
    input: SubmitInput & { timeout?: number },
    earlyExit: boolean,
): Promise<SubmitOutput & { txHash?: Hash; receiptPromise?: Promise<WaitForReceiptOutput> }> {
    const { entryPoint = deployment.EntryPoint, boop: ogBoop, timeout } = input
    let boop = ogBoop
    const boopHash = computeHash(boop)
    try {
        logger.trace("Submitting boop", boopHash)
        let simulation = await simulate(input, true)
        if (simulation.status !== Onchain.Success) return { ...simulation, stage: "simulate" }
        if (simulation.validityUnknownDuringSimulation || simulation.paymentValidityUnknownDuringSimulation) {
            return {
                status: Onchain.ValidationReverted,
                description: "More information needed for the boop to pass validation — most likely a signature.",
                stage: "submit",
            }
        }
        if (simulation.feeTooLowDuringSimulation) {
            return {
                status: Onchain.GasPriceTooHigh,
                description: `The onchain gas price is higher than the specified maxFeePerGas (${boop.maxFeePerGas} wei/gas).`,
                stage: "submit",
            }
        }
        if (boop.account === boop.payer) {
            // Self-paying boop must specifies its maxFeePerGas and gas limits to be
            // submitted (but not to be simulated). This will usually be caught above by the
            // lack of valid signature, but we must guard against signatures over zero values.
            if (!boop.maxFeePerGas || !boop.gasLimit || !boop.validateGasLimit || !boop.validateGasLimit) {
                // validatePaymentGasLimit can be 0 — it is not called for self-paying boops.
                return {
                    status: Onchain.MissingGasValues,
                    description:
                        "Trying to submit a self-paying boop without specifying all the necessary gas fees and limits.",
                    stage: "submit",
                }
            }
        }

        boop = updateBoopFromSimulation(boop, simulation)
        // We'll save again if we re-simulate, but it's important to do this before returning on the early exit path
        // so that we can service incoming waitForReceipt requests.
        await dbService.saveBoop(entryPoint, boop)

        const afterSimulationPromise = (async (): ReturnType<typeof submitInternal> => {
            if (simulation.futureNonceDuringSimulation) {
                logger.trace("boop has future nonce, waiting until it becomes unblocked", boopHash)
                const error = await boopNonceManager.waitUntilUnblocked(entryPoint, boop)
                logger.trace("boop unblocked", boopHash)
                if (error) return error
                simulation = await simulate(input) // update simulation
                if (simulation.status !== Onchain.Success) return { ...simulation, stage: "simulate" }
                boop = updateBoopFromSimulation(boop, simulation)
                await dbService.saveBoop(entryPoint, boop)
            } else {
                boopNonceManager.hintNonce(boop.account, boop.nonceTrack, boop.nonceValue)
            }

            const account = findExecutionAccount(input.boop)
            logger.trace("Submitting to the chain using execution account", account.address, boopHash)

            // TODO make sure this does no extra needless simulations
            const txHash = await walletClient.writeContract({
                address: input.entryPoint ?? deployment.EntryPoint,
                args: [encodeBoop(boop)],
                abi: abis.EntryPoint,
                functionName: "submit",
                gas: BigInt(simulation.gas),
                maxFeePerGas: simulation.maxFeePerGas,
                maxPriorityFeePerGas: 1n,
                account,
            })

            logger.trace("Successfully submitted", boopHash, txHash)
            boopNonceManager.incrementLocalNonce(boop)
            // We need to monitor the receipt to detect if we're stuck, and to be able to construct the receipt
            // (requires knowing the txHash).
            const receiptPromise = receiptService.waitForInclusion({ boopHash, txHash, timeout })
            return { status: Onchain.Success, boopHash, entryPoint, txHash, receiptPromise }
        })()

        if (earlyExit) return { status: Onchain.Success, boopHash, entryPoint }
        else return await afterSimulationPromise
    } catch (error) {
        return { ...outputForGenericError(error), stage: "submit" }
    }
}
