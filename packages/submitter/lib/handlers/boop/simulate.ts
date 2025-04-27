import type { Hex } from "@happy.tech/common"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { BaseError, zeroAddress } from "viem"
import { parseAccount } from "viem/accounts"
import { publicClient } from "#lib/clients"
import { getSubmitterFee } from "#lib/custom/feePolicy"
import { abis, deployment, env } from "#lib/env"
import { extractErrorMessage } from "#lib/errors/utils"
import { decodeRawError, getRevertError } from "#lib/errors/viem"
import type { SimulateInput, SimulateOutput } from "#lib/interfaces/boop_simulate.ts"
import { CallStatus } from "#lib/interfaces/contracts"
import { EntryPointStatus, SubmitterErrorStatus } from "#lib/interfaces/status"
import { logger } from "#lib/logger"
import { boopNonceManager, simulationCache } from "#lib/services"
import { encodeBoop } from "#lib/utils/encodeBoop"
import { type BigIntSerialized, serializeBigInt } from "#lib/utils/serializeBigInt"

export async function simulateFromRoute(
    input: SimulateInput,
): Promise<[BigIntSerialized<SimulateOutput>, ContentfulStatusCode]> {
    const output = await simulate(input)
    // TODO do better, maybe other successful statuses, better http codes
    return output.status === EntryPointStatus.Success
        ? ([serializeBigInt(output), 200] as const)
        : ([serializeBigInt(output), 422] as const)
}

export async function simulate({ entryPoint = deployment.EntryPoint, boop }: SimulateInput): Promise<SimulateOutput> {
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
        // TODO make sure nonce is gucci?
        await Promise.all([simulatePromise, gasPricePromise])

        // TODO inline boop into return value
        const { result: submitOutput } = await simulatePromise
        const gasPrice = await gasPricePromise
        const status = getEntryPointStatusFromCallStatus(submitOutput.callStatus)

        const margin = env.GAS_SAFETY_MARGIN
        // biome-ignore format: pretty
        const output = status === EntryPointStatus.Success
            ? {
                status,
                ...submitOutput,
                gas: boop.gasLimit || (submitOutput.gas * margin) / 100,
                validateGas: boop.validateGasLimit || (submitOutput.validateGas * margin) / 100,
                paymentValidateGas: boop.validatePaymentGasLimit || (submitOutput.validateGas * margin) / 100,
                executeGas: boop.executeGasLimit || (submitOutput.executeGas * margin) / 100,
                maxFeePerGas: gasPrice,
                submitterFee: getSubmitterFee(boop),
            } : {
                status,
                revertData: submitOutput.revertData,
            }

        await simulationCache.insertSimulation({ entryPoint, boop }, output)
        return output
    } catch (error) {
        const { raw, decoded, isContractRevert } = getRevertError(error)

        if (!isContractRevert) {
            if (error instanceof BaseError)
                return {
                    status: SubmitterErrorStatus.RpcError,
                    description: error.message,
                }

            return {
                status: SubmitterErrorStatus.UnexpectedError,
                description: extractErrorMessage(error),
            }
        }

        switch (decoded?.errorName) {
            case "InvalidNonce": {
                // We don't necessarily need to reset the nonce here, but we do it to be safe.
                boopNonceManager.resetLocalNonce(boop)
                return {
                    status: EntryPointStatus.InvalidNonce,
                    revertData: "0x",
                }
            }
            case "InsufficientStake": {
                const payer = boop.payer === zeroAddress ? "submitter" : "paymaster"
                return {
                    status: EntryPointStatus.InsufficientStake,
                    description: `The ${payer} has insufficient stake`,
                    revertData: "0x",
                }
            }
            case "PayoutFailed": {
                return {
                    status: EntryPointStatus.PayoutFailed,
                    description: "Payment of a self-paying boop failed",
                    revertData: "0x",
                }
            }
            case "ValidationReverted": {
                console.log(raw)
                return {
                    status: EntryPointStatus.ValidationReverted,
                    description:
                        "Account reverted in `validate` — this is not standard compliant behaviour.\n" +
                        "Are you sure you specified the correct account address?",
                    revertData: decoded.args[0] as Hex,
                }
            }
            case "ValidationRejected": {
                const decodedReason = decodeRawError(decoded.args[0] as Hex)
                switch (decodedReason?.errorName) {
                    case "InvalidSignature":
                        return {
                            status: EntryPointStatus.InvalidSignature,
                            description: "Account rejected the boop because of an invalid signature",
                            revertData: "0x",
                        }
                    case "InvalidExtensionValue":
                        return {
                            status: EntryPointStatus.InvalidExtensionValue,
                            description:
                                "Account rejected the boop because an extension value in the extraData is invalid",
                            revertData: "0x",
                        }
                    case "UnknownDuringSimulation": {
                        logger.error("escaped UnknownDuringSimulation — BIG BUG")
                    }
                }
                return {
                    status: EntryPointStatus.ValidationFailed,
                    description: "Account rejected the boop, try parsing the revertData to see why",
                    revertData: decoded.args[0] as Hex,
                }
            }
            case "PaymentValidationReverted": {
                return {
                    status: EntryPointStatus.PaymentValidationReverted,
                    description:
                        "Paymaster reverted in 'validatePayment` — this is not standard compliant behaviour.\n" +
                        "Are you sure you specified the correct paymaster address?",
                    revertData: decoded.args[0] as Hex,
                }
            }
            case "PaymentValidationRejected": {
                const decodedReason = decodeRawError(decoded.args[0] as Hex)
                switch (decodedReason?.errorName) {
                    case "InvalidSignature": {
                        return {
                            status: EntryPointStatus.InvalidSignature,
                            description: "Paymaster rejected the boop because of an invalid signature",
                            revertData: "0x",
                        }
                    }
                    case "SubmitterFeeTooHigh": {
                        // HappyPaymaster
                        return {
                            status: EntryPointStatus.PaymentValidationFailed,
                            description: `Paymaster rejected the boop because of the submitter fee (${boop.submitterFee} wei) was too high`,
                            revertData: decoded.args[0] as Hex,
                        }
                    }
                    case "InsufficientGasBudget": {
                        // HappyPaymaster
                        return {
                            status: EntryPointStatus.PaymentValidationFailed,
                            description: "The HappyPaymaster rejected the boop because your gas budget is insufficient",
                            revertData: decoded.args[0] as Hex,
                        }
                    }
                    case "UnknownDuringSimulation": {
                        logger.error("escaped UnknownDuringSimulation — BIG BUG")
                    }
                }
                return {
                    status: EntryPointStatus.PaymentValidationFailed,
                    description: "Paymaster rejected the boop, try parsing the revertData to see why",
                    revertData: decoded.args[0] as Hex,
                }
            }
            case "GasPriceTooHigh":
            case "MalformedBoop": {
                logger.error(`Got '${decoded.errorName}' error during simulation — this should never happen.`, boop)
                return {
                    status: EntryPointStatus.UnexpectedReverted,
                    description: `${decoded.errorName} during simulation — this is an implementation bug, please report!`,
                    revertData: "0x",
                }
            }
            default: {
                // In theory, OOG is the only way the entrypoint can revert that we haven't parsed yet.
                logger.error("Got unexpected revert error during simulation, most likely out of gas", {})
                return {
                    status: EntryPointStatus.UnexpectedReverted,
                    revertData: raw ?? "0x",
                }
            }
            // TODO later: extension stuff
        }
    }
}

function getEntryPointStatusFromCallStatus(callStatus: number): EntryPointStatus {
    switch (callStatus) {
        case CallStatus.SUCCEEDED:
            return EntryPointStatus.Success
        case CallStatus.CALL_REVERTED:
            return EntryPointStatus.CallReverted
        case CallStatus.EXECUTE_FAILED:
            return EntryPointStatus.ExecuteFailed
        case CallStatus.EXECUTE_REVERTED:
            return EntryPointStatus.ExecuteReverted
        default:
            throw new Error(`implementation error: unknown call status: ${callStatus}`)
    }
}
