import type { Hash } from "@happy.tech/common"
import type { Transaction } from "viem"
import { abis, deployment } from "#lib/env"
import { outputForGenericError } from "#lib/handlers/errors"
import { type SimulateSuccess, simulate } from "#lib/handlers/simulate"
import type { WaitForReceiptOutput } from "#lib/handlers/waitForReceipt"
import { boopNonceManager, computeHash, dbService, ogBoopCache, receiptService } from "#lib/services"
import { findExecutionAccount } from "#lib/services/evmAccounts"
import { type Boop, Onchain, SubmitterError } from "#lib/types"
import { encodeBoop } from "#lib/utils/boop/encodeBoop"
import { walletClient } from "#lib/utils/clients"
import { getMaxFeePerGas, getMaxPriorityFeePerGas } from "#lib/utils/gas"
import { logger } from "#lib/utils/logger"
import type { SubmitError, SubmitInput, SubmitOutput, SubmitSuccess } from "./types"

export async function submit(input: SubmitInput): Promise<SubmitOutput> {
    return await submitInternal(input, { earlyExit: true })
}

type SubmitOptionsEarlyExit = { timeout?: number; earlyExit: true; replacedTx?: undefined }
type SubmitOptionsLazyExit = { timeout?: number; earlyExit: false; replacedTx?: Transaction }
type SubmitOutputLazyExit =
    | (SubmitSuccess & { txHash: Hash; receiptPromise: Promise<WaitForReceiptOutput> })
    | (SubmitError & { txHash?: undefined; receiptPromise?: undefined })
type SubmitOptions = SubmitOptionsEarlyExit | SubmitOptionsLazyExit
type SubmitInternalOutput = SubmitOutput | SubmitOutputLazyExit

export async function submitInternal(input: SubmitInput, options: SubmitOptionsEarlyExit): Promise<SubmitOutput>
export async function submitInternal(input: SubmitInput, options: SubmitOptionsLazyExit): Promise<SubmitOutputLazyExit>
export async function submitInternal(input: SubmitInput, options: SubmitOptions): Promise<SubmitInternalOutput> {
    const { entryPoint = deployment.EntryPoint, boop } = input
    const { timeout, earlyExit, replacedTx } = options

    const boopHash = computeHash(boop)
    try {
        const [ogBoop, ogBoopError] = getOgBoop(boop, replacedTx)

        if (ogBoopError) return ogBoopError

        logger.trace("Submitting boop", boopHash)
        let simulation = await simulate({ entryPoint, boop: ogBoop }, true)
        if (simulation.status !== Onchain.Success) {
            ogBoopCache.delete(input.boop)
            return { ...simulation, stage: "simulate" }
        }

        if (simulation.validityUnknownDuringSimulation || simulation.paymentValidityUnknownDuringSimulation) {
            ogBoopCache.delete(input.boop)
            return {
                status: Onchain.ValidationReverted,
                description: "More information needed for the boop to pass validation — most likely a signature.",
                stage: "submit",
            }
        }
        if (simulation.feeTooLowDuringSimulation) {
            ogBoopCache.delete(input.boop)
            return {
                status: Onchain.GasPriceTooHigh,
                description: `The onchain gas price is higher than the specified maxFeePerGas (${boop.maxFeePerGas} wei/gas).`,
                stage: "submit",
            }
        }
        if (boop.account === boop.payer) {
            ogBoopCache.delete(input.boop)
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

        mutateBoopGasFromSimulation(boop, simulation)

        // We'll save again if we re-simulate, but it's important to do this before returning on the early exit path
        // so that we can service incoming waitForReceipt requests.
        await dbService.saveBoop(entryPoint, boop)

        const afterSimulationPromise = (async (): ReturnType<typeof submitInternal> => {
            try {
                if (simulation.futureNonceDuringSimulation && !replacedTx) {
                    logger.trace("boop has future nonce, waiting until it becomes unblocked", boopHash)
                    const error = await boopNonceManager.waitUntilUnblocked(entryPoint, boop)
                    logger.trace("boop unblocked", boopHash)
                    if (error) {
                        ogBoopCache.delete(input.boop)
                        return error
                    }
                    simulation = await simulate({ entryPoint, boop: ogBoop }) // update simulation
                    if (simulation.status !== Onchain.Success) {
                        ogBoopCache.delete(input.boop)
                        return { ...simulation, stage: "simulate" }
                    }
                    mutateBoopGasFromSimulation(boop, simulation)
                    await dbService.saveBoop(entryPoint, boop)
                } else {
                    boopNonceManager.hintNonce(boop.account, boop.nonceTrack, boop.nonceValue)
                }

                const account = findExecutionAccount(ogBoop)
                logger.trace("Submitting to the chain using execution account", account.address, boopHash)

                // TODO make sure this does no extra needless simulations
                const evmTxHash = await walletClient.writeContract({
                    address: entryPoint ?? deployment.EntryPoint,
                    args: [encodeBoop(boop)],
                    abi: abis.EntryPoint,
                    functionName: "submit",
                    nonce: replacedTx?.nonce,
                    gas: BigInt(simulation.gas),
                    maxFeePerGas: getMaxFeePerGas(simulation, replacedTx),
                    maxPriorityFeePerGas: getMaxPriorityFeePerGas(replacedTx),
                    account,
                })

                logger.trace("Successfully submitted", boopHash, evmTxHash)
                if (!replacedTx) boopNonceManager.incrementLocalNonce(boop)
                // We need to monitor the receipt to detect if we're stuck, and to be able to construct the receipt
                // (requires knowing the txHash).
                const receiptPromise = receiptService.waitForInclusion({ boopHash, boop, evmTxHash, timeout })
                return { status: Onchain.Success, boopHash, entryPoint, txHash: evmTxHash, receiptPromise }
            } catch (error) {
                ogBoopCache.delete(input.boop)
                return { ...outputForGenericError(error), stage: "submit" }
            }
        })()

        if (earlyExit) return { status: Onchain.Success, boopHash, entryPoint }
        else return await afterSimulationPromise
    } catch (error) {
        ogBoopCache.delete(input.boop)
        return { ...outputForGenericError(error), stage: "submit" }
    }
}

function getOgBoop(boop: Boop, replacedTx?: Transaction): [Boop, undefined] | [undefined, SubmitError] {
    const ogBoop = ogBoopCache.get(boop)

    if (replacedTx) {
        // is a replacement tx, and has OG Boop in cache, everything is ok
        if (ogBoop) return [ogBoop, undefined]
        // if we have a replacement TX, but no original boop
        // something went terribly wrong.
        logger.error("Replaced transaction without original boop in cache", { boop, replacedTx })
        return [
            undefined,
            {
                status: SubmitterError.UnexpectedError,
                description: "Replaced transaction without original boop in cache.",
                stage: "submit",
            },
        ]
    }

    // has an OG boop, but not a replacement tx - must be re-submit from outside
    // or something went wrong
    if (ogBoop) {
        return [
            undefined,
            {
                status: SubmitterError.AlreadyProcessing,
                description: "Already processing a boop with the same hash.",
                stage: "submit",
            },
        ]
    }

    // set the boop in the cache
    return [ogBoopCache.set(boop).get(boop)!, undefined]
}

function mutateBoopGasFromSimulation(boop: Boop, simulation: SimulateSuccess): Boop {
    if (boop.account === boop.payer) return boop

    const ogBoop = ogBoopCache.get(boop)
    if (!ogBoop) {
        logger.error("Tried to mutate boop from simulation, but original boop not found in cache", boop)
        return boop
    }

    boop.gasLimit = ogBoop.gasLimit || simulation.gas
    boop.validateGasLimit = ogBoop.validateGasLimit || simulation.validateGas
    boop.validatePaymentGasLimit = ogBoop.validatePaymentGasLimit || simulation.validatePaymentGas
    boop.executeGasLimit = ogBoop.executeGasLimit || simulation.executeGas
    boop.maxFeePerGas = ogBoop.maxFeePerGas || simulation.maxFeePerGas
    boop.submitterFee = ogBoop.submitterFee || simulation.submitterFee

    return boop
}
