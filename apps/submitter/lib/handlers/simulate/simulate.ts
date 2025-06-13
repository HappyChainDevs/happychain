import { trace } from "@opentelemetry/api"
import { zeroAddress } from "viem"
import { parseAccount } from "viem/accounts"
import { abis, deployment, env } from "#lib/env"
import { outputForExecuteError, outputForGenericError, outputForRevertError } from "#lib/handlers/errors"
import { notePossibleMisbehaviour } from "#lib/policies/misbehaviour"
import { getSubmitterFee, validateSubmitterFee } from "#lib/policies/submitterFee"
import { computeHash, simulationCache } from "#lib/services"
import { traceFunction } from "#lib/telemetry/traces"
import { type Boop, CallStatus, Onchain, type OnchainStatus, SubmitterError } from "#lib/types"
import { encodeBoop } from "#lib/utils/boop"
import { publicClient } from "#lib/utils/clients"
import { getFees, getMinFee } from "#lib/utils/gas"
import { logger } from "#lib/utils/logger"
import { getRevertError } from "#lib/utils/parsing"
import type { SimulateInput, SimulateOutput, SimulateSuccess } from "./types"

async function simulate(
    { entryPoint = deployment.EntryPoint, boop }: SimulateInput,
    forSubmit = false,
): Promise<SimulateOutput> {
    const boopHash = computeHash(boop)
    const encodedBoop = encodeBoop(boop)
    const selfPaying = boop.account === boop.payer

    const activeSpan = trace.getActiveSpan()
    activeSpan?.setAttribute("boopHash", boopHash)
    logger.trace("Simulating boop", boopHash, boop)

    // === Validate input gas values ===

    const invalidGasOutput = validateGasInput(boop, forSubmit, selfPaying)
    if (invalidGasOutput) return invalidGasOutput

    try {
        // === Simulate the boop & fetch the balance if needed ===

        const simulatePromise = publicClient.simulateContract({
            address: entryPoint,
            args: [encodedBoop],
            account: parseAccount(zeroAddress),
            abi: abis.EntryPoint,
            functionName: "submit",
        })

        const balancePromise = selfPaying
            ? await publicClient.getBalance({ address: boop.account })
            : Promise.resolve(null)

        const [{ result: entryPointOutput }, balance] = await Promise.all([simulatePromise, balancePromise])
        const status = getEntryPointStatusFromCallStatus(entryPointOutput.callStatus)

        if (status !== Onchain.Success)
            // EntryPoint.submit succeeded, but the execution failed.
            return outputForExecuteError(boop, status, entryPointOutput.revertData, "simulation")

        // === Construct output values ===

        // Note that by design we never override user-provided (non-zero) values.
        // Instead if the provided values are invalid, an error output is returned (or a boolean flag set for fees).
        // This happens in `validateGasInput`, and here for the boolean flags.

        const minFee = getMinFee()
        const maxFeePerGas = boop.maxFeePerGas || getFees().maxFeePerGas
        const output = {
            ...entryPointOutput,
            status: Onchain.Success,
            revertData: undefined,
            gas: boop.gasLimit || applyGasMargin(entryPointOutput.gas),
            validateGas: boop.validateGasLimit || applyGasMargin(entryPointOutput.validateGas),
            validatePaymentGas: boop.validatePaymentGasLimit || applyGasMargin(entryPointOutput.validatePaymentGas),
            executeGas: boop.executeGasLimit || applyGasMargin(entryPointOutput.executeGas),
            maxFeePerGas,
            submitterFee: selfPaying ? boop.submitterFee : boop.submitterFee || getSubmitterFee(boop),
            feeTooLowDuringSimulation: minFee > maxFeePerGas,
            feeTooHighDuringSimulation: maxFeePerGas > env.MAX_BASEFEE,
        } satisfies SimulateSuccess

        // === Validate balance ===

        if (balance !== null) {
            // `balance !== null` implies `selfPaying`
            // During simulation the gas price is usually 0, so we check here instead.
            const cost = BigInt(output.gas) * output.maxFeePerGas + output.submitterFee
            if (balance < cost)
                return {
                    status: Onchain.PayoutFailed,
                    error: "Not enough funds to pay for a self-paying boop.",
                }
        }

        // === Cache & return ===

        await simulationCache.set(boopHash, output)
        logger.trace("Finished simulation with output", boopHash, output)
        return output
    } catch (error) {
        const revert = getRevertError(error)
        const output = revert.isContractRevert
            ? outputForRevertError(entryPoint, boop, boopHash, revert.decoded, "simulation")
            : outputForGenericError(error)

        notePossibleMisbehaviour(boop, output, "simulation")
        return output
    }
}

function outputForInvalidGasValue(error: string): SimulateOutput {
    return { status: SubmitterError.InvalidValues, error }
}

/**
 * Checks if the gas value are valid and consistent, and if not returns the output to be returned.
 */
function validateGasInput(boop: Boop, forSubmit: boolean, selfPaying: boolean): SimulateOutput | undefined {
    const out = outputForInvalidGasValue

    if (forSubmit && selfPaying && (boop.gasLimit === 0 || boop.executeGasLimit === 0 || boop.validateGasLimit === 0)) {
        return out("All non-paymaster gas limits must be specified when submitting a self-paying boop.")
    }
    if ((forSubmit && selfPaying) || boop.gasLimit > 0) {
        const gasLimitSum = boop.executeGasLimit + boop.validateGasLimit + boop.validatePaymentGasLimit
        if (boop.gasLimit < gasLimitSum + env.ENTRYPOINT_GAS_BUFFER)
            return out("The total gas limit is less than the sum of entrypoint execution and inner gas limits.")
    }
    if (boop.executeGasLimit > 0 && boop.executeGasLimit < env.MINIMUM_EXECUTE_GAS) {
        return out(`The execute gas limit is less than the minimum of ${env.MINIMUM_EXECUTE_GAS}.)`)
    }
    if (boop.validateGasLimit > 0 && boop.validateGasLimit > 0 && boop.validateGasLimit < env.MINIMUM_VALIDATE_GAS) {
        return out(`The validate gas limit is less than the minimum of ${env.MINIMUM_VALIDATE_GAS}.`)
    }
    if (boop.validatePaymentGasLimit > 0 && boop.validatePaymentGasLimit < env.MINIMUM_VALIDATE_PAYMENT_GAS) {
        return out(`The payment validate gas limit is less than the minimum of ${env.MINIMUM_VALIDATE_PAYMENT_GAS}.)`)
    }
    if (boop.gasLimit > env.MAX_GAS_LIMIT) {
        return out(`The gas limit is greater than the maximum of ${env.MAX_GAS_LIMIT}.)`)
    }
    if (selfPaying || boop.submitterFee > 0) {
        const description = validateSubmitterFee(boop)
        if (description) return out(description)
    }
}

function applyGasMargin(value: number): number {
    return Math.ceil((value * (100 + env.GAS_SAFETY_MARGIN)) / 100)
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

const tracedSimulate = traceFunction(simulate, "simulate")

export { tracedSimulate as simulate }
