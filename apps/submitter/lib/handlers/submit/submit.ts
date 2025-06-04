import type { Hash } from "@happy.tech/common"
import { abis, deployment, env } from "#lib/env"
import { outputForGenericError } from "#lib/handlers/errors"
import { type SimulateSuccess, simulate } from "#lib/handlers/simulate"
import type { WaitForReceiptOutput } from "#lib/handlers/waitForReceipt"
import {
    boopNonceManager,
    boopStore,
    computeHash,
    evmNonceManager,
    findExecutionAccount,
    receiptService,
} from "#lib/services"
import { type Boop, type EvmTxInfo, Onchain, SubmitterError } from "#lib/types"
import { encodeBoop } from "#lib/utils/boop/encodeBoop"
import { walletClient } from "#lib/utils/clients"
import { getMaxFeePerGas, getMaxPriorityFeePerGas } from "#lib/utils/gas"
import { logger } from "#lib/utils/logger"
import type { SubmitError, SubmitInput, SubmitOutput, SubmitSuccess } from "./types"

export async function submit(input: SubmitInput): Promise<SubmitOutput> {
    const { evmTxHash, receiptPromise, ...output } = await submitInternal({ ...input, earlyExit: true })
    // Only delete in case of error, otherwise we're still waiting for the receipt.
    if (output.status !== Onchain.Success) boopStore.delete(input.boop)
    return output
}

type SubmitInternalInput = SubmitInput & {
    timeout?: number
    earlyExit?: boolean
    replacedTx?: EvmTxInfo
}

type SubmitInternalOutput =
    | (SubmitSuccess & { evmTxHash?: Hash; receiptPromise?: Promise<WaitForReceiptOutput> })
    | (SubmitError & { evmTxHash?: undefined; receiptPromise?: undefined })

export async function submitInternal(input: SubmitInternalInput): Promise<SubmitInternalOutput> {
    const { entryPoint = deployment.EntryPoint, boop, timeout, earlyExit, replacedTx } = input

    const boopHash = computeHash(boop)
    try {
        const [ogBoop, ogBoopError] = getOriginalBoop(input)
        if (ogBoopError) return ogBoopError

        logger.trace("Submitting boop", boopHash)
        let simulation = await simulate({ entryPoint, boop }, true)
        if (simulation.status !== Onchain.Success) return { ...simulation, stage: "simulate" }

        if (simulation.validityUnknownDuringSimulation || simulation.paymentValidityUnknownDuringSimulation)
            return {
                status: Onchain.ValidationReverted,
                description: "More information needed for the boop to pass validation — most likely a signature.",
                stage: "submit",
            }
        if (simulation.feeTooLowDuringSimulation)
            return {
                status: Onchain.GasPriceTooHigh,
                description: `The onchain gas price is higher than the specified maxFeePerGas (${boop.maxFeePerGas} wei/gas).`,
                stage: "submit",
            }

        // Self-paying boops must specifies their maxFeePerGas and gas limits to be
        // submitted (but not to be simulated). This will usually be caught above by the
        // lack of valid signature, but we must guard against signatures over zero values.
        const selfPaying = boop.account === boop.payer
        if (selfPaying && (!boop.maxFeePerGas || !boop.gasLimit || !boop.validateGasLimit || !boop.validateGasLimit))
            // validatePaymentGasLimit can be 0 — it is not called for self-paying boops.
            return {
                status: Onchain.MissingGasValues,
                description:
                    "Trying to submit a self-paying boop without specifying all the necessary gas fees and limits.",
                stage: "submit",
            }

        mutateBoopGasFromSimulation(ogBoop, boop, simulation)

        const afterSimulationPromise = (async (): Promise<SubmitInternalOutput> => {
            try {
                if (simulation.futureNonceDuringSimulation && !replacedTx && boopNonceManager.isBlocked(boop)) {
                    logger.trace("boop has future nonce, waiting until it becomes unblocked", boopHash)
                    const error = await boopNonceManager.waitUntilUnblocked(entryPoint, boop)
                    logger.trace("boop unblocked", boopHash)
                    if (error) return error
                    // Update simulation with the original boop so we can get updated gas values.
                    simulation = await simulate({ entryPoint, boop: ogBoop })
                    if (simulation.status !== Onchain.Success) {
                        boopStore.delete(input.boop)
                        return { ...simulation, stage: "simulate" }
                    }
                    mutateBoopGasFromSimulation(ogBoop, boop, simulation)
                } else {
                    boopNonceManager.hintNonce(boop.account, boop.nonceTrack, boop.nonceValue)
                }

                const account = findExecutionAccount(boop)
                logger.trace("Submitting to the chain using execution account", account.address, boopHash)

                const partialEvmTxInfo: Omit<EvmTxInfo, "evmTxHash"> = {
                    nonce:
                        replacedTx?.nonce ??
                        (await evmNonceManager.consume({
                            address: account.address,
                            chainId: env.CHAIN_ID,
                            client: walletClient,
                        })),
                    maxFeePerGas: getMaxFeePerGas(simulation.maxFeePerGas, replacedTx),
                    maxPriorityFeePerGas: getMaxPriorityFeePerGas(replacedTx),
                }

                // TODO: implement own nonce manager, Viem's one sucks and always incurs a eth_getTransactionCount
                const evmTxHash = await walletClient.writeContract({
                    account,
                    address: entryPoint,
                    args: [encodeBoop(boop)],
                    abi: abis.EntryPoint,
                    functionName: "submit",
                    gas: BigInt(simulation.gas),
                    ...partialEvmTxInfo,
                })

                logger.trace("Successfully submitted", boopHash, evmTxHash)
                if (!replacedTx) boopNonceManager.incrementLocalNonce(boop)

                // We need to monitor the receipt to detect if we're stuck, and to be able to construct the receipt
                // (requires knowing the txHash).
                const evmTxInfo = { ...partialEvmTxInfo, to: entryPoint, evmTxHash }
                const args = { boopHash, boop, entryPoint, evmTxInfo, timeout }
                const receiptPromise = receiptService.waitForInclusion(args)
                return { status: Onchain.Success, boopHash, entryPoint, evmTxHash, receiptPromise }
            } catch (error) {
                return { ...outputForGenericError(error), stage: "submit" }
            }
        })()

        if (earlyExit) return { status: Onchain.Success, boopHash, entryPoint }
        else return await afterSimulationPromise
    } catch (error) {
        return { ...outputForGenericError(error), stage: "submit" }
    }
}

function getOriginalBoop({
    boop,
    entryPoint,
    replacedTx,
}: SubmitInternalInput): [Boop, undefined] | [undefined, SubmitError] {
    const ogBoop = boopStore.getByHash(computeHash(boop))

    if (replacedTx) {
        if (ogBoop) return [ogBoop, undefined]
        // If we have a replacement TX, but no original boop, something went terribly wrong.
        logger.error("Replaced transaction without original boop in cache", { boop, replacedTx })
        // biome-ignore format: terse
        return [ undefined, {
            status: SubmitterError.UnexpectedError,
            description: "Replaced EVM transaction without original boop in cache.",
            stage: "submit",
        }]
    }

    if (!ogBoop) {
        // This is the first time we see the boop, save it, then return the frozen version from the store.
        boopStore.set(boop, entryPoint ?? deployment.EntryPoint)
        return [boopStore.getByHash(computeHash(boop))!, undefined]
    }

    // The boop is already known but this isn't an internal replacement — the boop was resubmitted by the user.
    // The current behaviour is to always reject in this case.
    return [
        undefined,
        {
            status: SubmitterError.AlreadyProcessing,
            description: "Already processing a boop with the same hash.",
            stage: "submit",
        },
    ]
}

/**
 * Mutates {@link boop} with updated gas limit & fees from the simulation, honoring
 * values specified in the original boop ({@link ogBoop} whenever specified).
 */
function mutateBoopGasFromSimulation(ogBoop: Boop, boop: Boop, simulation: SimulateSuccess): void {
    // We can't mutate self-paying boop values, but they will be validated during simulation.
    if (boop.account === boop.payer) return
    boop.gasLimit = ogBoop.gasLimit || simulation.gas
    boop.validateGasLimit = ogBoop.validateGasLimit || simulation.validateGas
    boop.validatePaymentGasLimit = ogBoop.validatePaymentGasLimit || simulation.validatePaymentGas
    boop.executeGasLimit = ogBoop.executeGasLimit || simulation.executeGas
    boop.maxFeePerGas = ogBoop.maxFeePerGas || simulation.maxFeePerGas
    boop.submitterFee = ogBoop.submitterFee || simulation.submitterFee
}
