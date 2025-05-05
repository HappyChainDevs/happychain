import { zeroAddress } from "viem"
import { parseAccount } from "viem/accounts"
import { type Boop, Onchain, computeBoopHash } from "#lib/client"
import { getSubmitterFee } from "#lib/custom/feePolicy"
import { abis, deployment, env } from "#lib/env"
import { outputForExecuteError, outputForGenericError, outputForRevertError } from "#lib/handlers/errors"
import { simulationCache } from "#lib/services"
import type { OnchainStatus } from "#lib/types"
import { CallStatus, SubmitterError } from "#lib/types"
import { encodeBoop } from "#lib/utils/boop/encodeBoop"
import { publicClient } from "#lib/utils/clients"
import { logger } from "#lib/utils/logger"
import { getRevertError } from "#lib/utils/parsing"
import type { SimulateInput, SimulateOutput } from "./types"

export async function simulate(
    { entryPoint = deployment.EntryPoint, boop }: SimulateInput,
    forSubmit = false,
): Promise<SimulateOutput> {
    const boopHash = computeBoopHash(env.CHAIN_ID, boop)
    const encodedBoop = encodeBoop(boop)
    const selfPaying = boop.account === boop.payer

    logger.trace("Simulating boop", boopHash, boop)
    const invalidGasOutput = validateGasInput(boop, forSubmit, selfPaying)
    if (invalidGasOutput) return invalidGasOutput

    try {
        logger.trace("Submitting eth_call", boopHash)
        const simulatePromise = publicClient.simulateContract({
            address: entryPoint,
            args: [encodedBoop],
            account: parseAccount(zeroAddress),
            abi: abis.EntryPoint,
            functionName: "submit",
        })
        const gasPricePromise = publicClient.getGasPrice()

        const balancePromise =
            boop.account === boop.payer
                ? await publicClient.getBalance({ address: boop.account })
                : Promise.resolve(null)

        // TODO make sure nonce is gucci / prefetched?
        // TODO inline boop into return value
        const [{ result: entryPointOutput }, gasPrice, balance] = await Promise.all([
            simulatePromise,
            gasPricePromise,
            balancePromise,
        ])
        const status = getEntryPointStatusFromCallStatus(entryPointOutput.callStatus)

        // EntryPoint.submit succeeded, but the execution failed.
        if (status !== Onchain.Success) return outputForExecuteError(status, entryPointOutput.revertData)

        const output = {
            ...entryPointOutput,
            status,
            gas: boop.gasLimit || applyGasMargin(entryPointOutput.gas),
            validateGas: boop.validateGasLimit || applyGasMargin(entryPointOutput.validateGas),
            validatePaymentGas: boop.validatePaymentGasLimit || applyGasMargin(entryPointOutput.validatePaymentGas),
            executeGas: boop.executeGasLimit || applyGasMargin(entryPointOutput.executeGas) * 3,
            maxFeePerGas: boop.maxFeePerGas || (gasPrice * env.FEE_SAFETY_MARGIN) / 100n,
            submitterFee: getSubmitterFee(boop),
        }

        if (output.status === Onchain.Success && balance !== null) {
            // During simulation the gas price is usually 0, so we check here instead.
            const cost = BigInt(output.gas) * output.maxFeePerGas + output.submitterFee
            if (balance < cost)
                return {
                    status: Onchain.PayoutFailed,
                    description: "Not enough funds to pay for a self-paying boop.",
                }
        }

        await simulationCache.insertSimulation({ entryPoint, boop }, output)
        logger.trace("Finished simulation with output", output)
        return output
    } catch (error) {
        const revert = getRevertError(error)
        const output = revert.isContractRevert
            ? outputForRevertError(boop, boopHash, revert.decoded)
            : outputForGenericError(error)

        noteSimulationMisbehaviour(boop, output)
        return output
    }
}

/**
 * Checks if the gas value are valid and consistent, and if not returns the output to be returned.
 */
function validateGasInput(boop: Boop, forSubmit: boolean, selfPaying: boolean): SimulateOutput | undefined {
    function out(description: string) {
        return { status: SubmitterError.InvalidGasValues, description }
    }

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
export function noteSimulationMisbehaviour(_boop: Boop, output: SimulateOutput): void {
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
