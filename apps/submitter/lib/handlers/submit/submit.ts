import type { Hash } from "@happy.tech/common"
import { trace } from "@opentelemetry/api"
import { type BaseError, InsufficientFundsError } from "viem"
import { abis, deployment } from "#lib/env"
import { outputForGenericError } from "#lib/handlers/errors"
import { simulate } from "#lib/handlers/simulate"
import type { WaitForReceiptOutput } from "#lib/handlers/waitForReceipt"
import {
    boopNonceManager,
    boopReceiptService,
    boopStore,
    computeHash,
    evmNonceManager,
    findExecutionAccount,
    walletClient,
} from "#lib/services"
import { accountDeployer } from "#lib/services/evmAccounts"
import { traceFunction } from "#lib/telemetry/traces"
import { type Boop, type EvmTxInfo, Onchain, SubmitterError } from "#lib/types"
import { encodeBoop, updateBoopFromSimulation } from "#lib/utils/boop"
import { getFees } from "#lib/utils/gas"
import { logger } from "#lib/utils/logger"
import { isNonceTooLowError } from "#lib/utils/viem"
import type { SubmitError, SubmitInput, SubmitOutput, SubmitSuccess } from "./types"

async function submit(input: SubmitInput): Promise<SubmitOutput> {
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

async function submitInternal(input: SubmitInternalInput): Promise<SubmitInternalOutput> {
    const { entryPoint = deployment.EntryPoint, timeout, earlyExit, replacedTx } = input
    let boop = input.boop

    const boopHash = computeHash(boop)
    const activeSpan = trace.getActiveSpan()
    activeSpan?.setAttribute("boopHash", boopHash)
    try {
        const [ogBoop, ogBoopError] = getOriginalBoop(input)
        if (ogBoopError) return ogBoopError

        // === Simulate ===

        logger.trace("Submitting boop", boopHash)
        let simulation = await simulate({ entryPoint, boop }, true)

        if (simulation.status !== Onchain.Success) return { ...simulation, stage: "simulate" }

        // === Validate simulation results & update boop ===
        if (simulation.validityUnknownDuringSimulation || simulation.paymentValidityUnknownDuringSimulation)
            return {
                status: Onchain.ValidationReverted,
                error: "More information needed for the boop to pass validation — most likely a signature.",
                stage: "submit",
            }

        if (simulation.feeTooLowDuringSimulation) return gasPriceTooLow

        const selfPaying = boop.account === boop.payer
        if (selfPaying && (!boop.maxFeePerGas || !boop.gasLimit || !boop.validateGasLimit || !boop.validateGasLimit))
            // Self-paying boops must specifies their maxFeePerGas and gas limits to be
            // submitted (but not to be simulated). This will usually be caught above by the
            // lack of valid signature, but we must guard against signatures over zero values.
            //
            // `validatePaymentGasLimit` can be 0 — it is not called for self-paying boops.
            return {
                status: Onchain.MissingGasValues,
                error: "Trying to submit a self-paying boop without specifying all the necessary gas fees and limits.",
                stage: "submit",
            }

        if (!selfPaying) boop = updateBoopFromSimulation(ogBoop, simulation)

        const afterSimulationPromise = (async (): Promise<SubmitInternalOutput> => {
            try {
                // === Wait for the nonce to be ready to submit ===

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
                    if (!selfPaying) boop = updateBoopFromSimulation(ogBoop, simulation)
                } else {
                    boopNonceManager.hintNonce(boop.account, boop.nonceTrack, boop.nonceValue)
                }

                // === Fee revalidation ===

                // Simulation & the validation of its result did validate the fees, however the fees might have changed
                // since, or this may be a replacement submit, which wasn't taken into account by simulation.

                const account = findExecutionAccount(boop)
                const { fees, minFee, minBlockFee, error } = getFees(boopHash, replacedTx)
                if (error) return { status: SubmitterError.GasPriceTooHigh, stage: "submit", error }

                if (simulation.maxFeePerGas < minFee) {
                    if (!ogBoop.maxFeePerGas) {
                        // This is a sponsored boop with no explicit gas price, we can freely change it.
                        boop.maxFeePerGas = fees.maxFeePerGas
                    } else if (replacedTx && simulation.maxFeePerGas >= minBlockFee) {
                        // The EVM tx gas price can be higher than the boop gas price. Because the gas is only required
                        // to be higher because of replacement, but the excess base fee is refunded, this shouldn't
                        // incur a loss to the submitter. The increase in priority fee is assumed to be negligible.
                    } else {
                        // The user explicitly specified a fee that is now too low, reject.
                        return gasPriceTooLow
                    }
                }

                // NOTE 1: We use `fees.maxFeePerGas` even if `minFee <= simulation.maxFeePerGas < fees.maxFeePerGas`.
                // This could incur a submitter loss, but cancelling a tx also has a cost.
                // If this is a concern to you, you should tweak `env.BASEFEE_MARGIN` and
                // `env.MIN_BASEFEE_MARGIN` (setting these two to be identical removes the risk).

                // NOTE 2: `fees.maxFeePerGas` can be lower than `simulation.maxFeePerGas` if the user specified a
                // large `maxFeePerGas` or the gas price went down. This is perfectly safe.

                // === Submit onchain ===

                const partialEvmTxInfo: Omit<EvmTxInfo, "evmTxHash"> = {
                    nonce: replacedTx?.nonce ?? (await evmNonceManager.consume(account.address)),
                    ...fees,
                }

                // TODO: implement own nonce manager, Viem's one sucks and always incurs a eth_getTransactionCount
                logger.trace("Submitting to the chain using execution account", account.address, boopHash)

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
                const receiptPromise = boopReceiptService.waitForInclusion(args)
                return { status: Onchain.Success, boopHash, entryPoint, evmTxHash, receiptPromise }
            } catch (error) {
                if (isNonceTooLowError(error)) evmNonceManager.resyncIfTooLow(accountDeployer.address)

                if ((error as BaseError)?.walk((e) => e instanceof InsufficientFundsError)) {
                    return {
                        status: SubmitterError.UnexpectedError,
                        error: "Submitter failed to pay for the boop.",
                        stage: "submit",
                    }
                }
                return { ...outputForGenericError(error), stage: "submit" }
            }
        })()

        if (earlyExit) return { status: Onchain.Success, boopHash, entryPoint }
        else return await afterSimulationPromise
    } catch (error) {
        return { ...outputForGenericError(error), stage: "submit" }
    }
}

const gasPriceTooLow = {
    status: Onchain.GasPriceTooLow,
    stage: "submit",
    error: "The network's gas price is higher than the specified maxFeePerGas.",
} as const

function getOriginalBoop_({
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
            error: "Replaced EVM transaction without original boop in cache.",
            stage: "submit",
        }]
    }

    if (ogBoop) {
        // The boop is already known but this isn't an internal replacement — the boop was resubmitted by the user.
        // The current behaviour is to always reject in this case.
        const error = "Already processing a boop with the same hash."
        return [undefined, { status: SubmitterError.AlreadyProcessing, error, stage: "submit" }]
    }

    if (boopStore.hasNonce(boop.account, boop.nonceTrack, boop.nonceValue)) {
        // A different boop with the same account/nonceTrack/nonceValue is already being processed
        const error = "Already processing a boop with the same account and nonce."
        return [undefined, { status: SubmitterError.AlreadyProcessing, error, stage: "submit" }]
    }

    // This is the first time we see the boop, save it, then return the frozen version from the store.
    boopStore.set(boop, entryPoint ?? deployment.EntryPoint)
    return [boopStore.getByHash(computeHash(boop))!, undefined]
}
const getOriginalBoop = traceFunction(getOriginalBoop_, "getOriginalBoop")

const tracedSubmit = traceFunction(submit, "submit")
const tracedSubmitInternal = traceFunction(submitInternal, "submitInternal")

export { tracedSubmit as submit, tracedSubmitInternal as submitInternal }
