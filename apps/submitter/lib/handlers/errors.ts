import type { Address, Hash, Hex } from "@happy.tech/common"
import { BaseError, zeroAddress } from "viem"
import { notePossibleMisbehaviour } from "#lib/policies/misbehaviour"
import { boopNonceManager } from "#lib/services"
import { type Boop, Onchain, type OnchainStatus, SubmitterError, type SubmitterErrorStatus } from "#lib/types"
import { logger } from "#lib/utils/logger"
import { type DecodedRevertError, decodeRawError, extractErrorMessage } from "#lib/utils/parsing"

export type SubmitterErrorOutput = {
    status: SubmitterErrorStatus
    description: string
}

export type OnchainErrorOutput = {
    status: Exclude<OnchainStatus, typeof Onchain.Success>
    revertData?: Hex
    description: string
}

/**
 * Return error information for a generic error.
 * If we could determine that the error was a contract revert, call {@link outputForRevertError} instead.
 */
export function outputForGenericError(error: unknown): SubmitterErrorOutput {
    if (error instanceof BaseError)
        return {
            status: SubmitterError.RpcError,
            description: error.message,
        }

    return {
        status: SubmitterError.UnexpectedError,
        description: extractErrorMessage(error) ?? "An unknown error occured.",
    }
}

/**
 * Return error information for an onchain revert (either during simulation or execution).
 */
export function outputForRevertError(
    entryPoint: Address,
    boop: Boop,
    boopHash: Hash,
    decoded: DecodedRevertError | undefined,
    simulation?: "simulation",
): OnchainErrorOutput {
    switch (decoded?.errorName) {
        case "InvalidNonce": {
            // We don't necessarily need to resync if we're in simulation, but we do it anyway to be safe.
            void boopNonceManager.resyncNonce(entryPoint, boop.account, boop.nonceTrack)
            return {
                status: Onchain.InvalidNonce,
                description: "The nonce of the boop is too low.",
            }
        }
        case "InsufficientStake": {
            const payer = boop.payer === zeroAddress ? "submitter" : "paymaster"
            return {
                status: Onchain.InsufficientStake,
                description: `The ${payer} has insufficient stake`,
            }
        }
        case "PayoutFailed": {
            return {
                status: Onchain.PayoutFailed,
                description: "Payment of a self-paying boop failed",
            }
        }
        case "ValidationReverted": {
            const decodedReason = decodeRawError(decoded.args[0] as Hex)
            if (decodedReason?.errorName === "AccountPaidSessionKeyBoop")
                return {
                    status: Onchain.ValidationReverted,
                    revertData: decoded.args[0] as Hex,
                    description: "Trying to validate a self-paying boop with a session key.",
                }
            return {
                status: Onchain.ValidationReverted,
                description: "Account reverted in `validate`. " + faultyAccount + (simulation ? correctAddress : ""),
                revertData: decoded.args[0] as Hex,
            }
        }
        case "ValidationRejected": {
            const decodedReason = decodeRawError(decoded.args[0] as Hex)

            // ExtensionAlreadyRegistered
            switch (decodedReason?.errorName) {
                case "InvalidSignature":
                    return {
                        status: Onchain.InvalidSignature,
                        description: "Account rejected the boop because of an invalid signature",
                    }
                case "InvalidExtensionValue":
                    return {
                        status: Onchain.InvalidExtensionValue,
                        description: "Account rejected the boop because an extension value in the extraData is invalid",
                    }
                case "ExtensionNotRegistered":
                    return {
                        status: Onchain.ExtensionNotRegistered,
                        description:
                            "Account rejected the boop because it requested an extension that was not registered.",
                    }
                case "UnknownDuringSimulation": {
                    logger.error("escaped UnknownDuringSimulation — BIG BUG")
                }
            }

            return {
                status: Onchain.ValidationRejected,
                description: "Account rejected the boop. " + tryParsing,
                revertData: decoded.args[0] as Hex,
            }
        }
        case "PaymentValidationReverted": {
            return {
                status: Onchain.PaymentValidationReverted,
                description:
                    "Paymaster reverted in 'validatePayment` — this is not standard compliant behaviour." +
                    (simulation ? correctAddress : ""),
                revertData: decoded.args[0] as Hex,
            }
        }
        case "PaymentValidationRejected": {
            const decodedReason = decodeRawError(decoded.args[0] as Hex)
            switch (decodedReason?.errorName) {
                case "InvalidSignature": {
                    return {
                        status: Onchain.InvalidSignature,
                        description: "Paymaster rejected the boop because of an invalid signature",
                    }
                }
                case "SubmitterFeeTooHigh": {
                    // HappyPaymaster
                    return {
                        status: Onchain.PaymentValidationRejected,
                        description: `Paymaster rejected the boop because of the submitter fee (${boop.submitterFee} wei) was too high`,
                        revertData: decoded.args[0] as Hex,
                    }
                }
                case "InsufficientGasBudget": {
                    // HappyPaymaster
                    return {
                        status: Onchain.PaymentValidationRejected,
                        description: "The HappyPaymaster rejected the boop because your gas budget is insufficient",
                        revertData: decoded.args[0] as Hex,
                    }
                }
                case "UnknownDuringSimulation": {
                    logger.error("escaped UnknownDuringSimulation — BIG BUG")
                }
            }
            return {
                status: Onchain.PaymentValidationRejected,
                description: "Paymaster rejected the boop. " + tryParsing,
                revertData: decoded.args[0] as Hex,
            }
        }
        case "GasPriceTooHigh": {
            if (simulation) {
                logger.error("escape GasPriceTooHigh during simulation — BIG BUG", boopHash)
                return {
                    status: Onchain.GasPriceTooLow,
                    description: "GasPriceTooHigh during simulation — this is an implementation bug, please report!",
                }
            } else {
                return {
                    status: Onchain.GasPriceTooLow,
                    description:
                        "The boop got rejected because the gas price was above the maxFeePerGas.\n" +
                        "Try again, with a higher maxFeePerGas if you are setting it manually.",
                }
            }
        }
        case "MalformedBoop": {
            return {
                status: Onchain.UnexpectedReverted,
                description: "Malformed boop simulated or submitted — this is an implementation bug, please report!",
            }
        }
        case "ExtensionAlreadyRegistered": {
            return {
                status: Onchain.ExtensionAlreadyRegistered,
                description: `Extension ${decoded.args[0]} of type ${decoded.args[1]} has already been registered for this account.`,
            }
        }
        default: {
            // In theory, OOG is the only way the entrypoint can revert that we haven't parsed yet.
            // But we check for this explicitly in the ReceiptService, replacing this error.
            return {
                status: Onchain.UnexpectedReverted,
                description: "The boop caused an unexpected revert.",
            }
        }
    }
}

/**
 * Returns error information for an `execute` error, which do not trigger a revert
 * from the EntryPoint and are thus handled separately. These errors can be detected
 * after simulation or onchain simulation (indicated by {@link simulation} being set).
 */
export function outputForExecuteError(
    boop: Boop,
    status: OnchainStatus,
    revertData: Hex,
    simulation?: "simulation",
): OnchainErrorOutput {
    switch (status) {
        case Onchain.CallReverted:
            return {
                status,
                revertData,
                description: "The call made by the account's `execute` function reverted.\n" + tryParsing,
            }
        case Onchain.ExecuteRejected: {
            const decodedReason = decodeRawError(revertData)
            if (decodedReason?.errorName === "InvalidExtensionValue")
                return {
                    status: Onchain.InvalidExtensionValue,
                    description:
                        "The account's `execute` function rejected the call because an extension value in the extraData is invalid.",
                }
            if (decodedReason?.errorName === "ExtensionNotRegistered")
                return {
                    status: Onchain.ExtensionNotRegistered,
                    description:
                        "The account's `execute` function rejected the call because the `extraData` specified an extension that was not registered on the account.",
                }
            if (decodedReason?.errorName)
                return {
                    status,
                    revertData,
                    description:
                        `The account's \`execute\` function rejected the call with reason: ${decodedReason.errorName}.\n` +
                        `${tryParsing}\n${unexpectedDecode}`,
                }
            return {
                status: Onchain.ExecuteRejected,
                revertData,
                description: "The account's `execute` function rejected the call.\n" + tryParsing,
            }
        }
        case Onchain.ExecuteReverted: {
            let output: OnchainErrorOutput
            const decodedReason = decodeRawError(revertData)
            switch (decodedReason?.errorName) {
                case "CannotRegisterSessionKeyForValidator": {
                    const description =
                        "Trying to register a session key to interact with the session key validator itself, which is not allowed."
                    output = { status, revertData, description }
                    break
                }
                case "CannotRegisterSessionKeyForAccount": {
                    const description =
                        "Trying to register a session key to interact with a boop account, which is not allowed."
                    output = { status, revertData, description }
                    break
                }
            }
            output = decodedReason?.errorName
                ? {
                      status,
                      revertData,
                      description:
                          `The account's \`execute\` function reverted with reason: ${decodedReason.errorName}.\n` +
                          `${tryParsing}\n${faultyAccount}\n${unexpectedDecode}`,
                  }
                : {
                      status,
                      revertData,
                      description: "The account's `execute` function reverted.\n" + faultyAccount,
                  }
            notePossibleMisbehaviour(boop, output, simulation)
            return output
        }
        default:
            throw new Error("Implementation error: invalid status passed to `outputForExecuteError`")
    }
}

const tryParsing = "Try parsing the revertData to understand why."

const unexpectedDecode =
    "Implementation note: we did not expect to be able to decode the error here.\n" +
    "This may be an account implementation issue, or reverting with an error with identical signature to a known error."

const faultyAccount = "This is indicative of a faulty account implementation, which the submitter may penalize."

const correctAddress = "\nAre you sure you specified the correct account address?"
