import type { Hash, Hex } from "@happy.tech/common"
import { BaseError, zeroAddress } from "viem"
import { extractErrorMessage } from "#lib/errors/utils"
import { decodeRawError, getRevertError } from "#lib/errors/viem"
import type { PartialBoop } from "#lib/interfaces/Boop"
import { Onchain } from "#lib/interfaces/Onchain"
import { SubmitterError } from "#lib/interfaces/SubmitterError"
import { logger } from "#lib/logger"
import { boopNonceManager } from "#lib/services"

export type ErrorInfo = {
    status: string
    description?: string
    revertData?: Hex
}

export type ProcessErrorInput = {
    boop: PartialBoop
    boopHash: Hash
    error: unknown
    simulation?: boolean
}

export function processError({ boop, boopHash, error, simulation = false }: ProcessErrorInput): ErrorInfo {
    const { raw, decoded, isContractRevert } = getRevertError(error)

    if (!isContractRevert) {
        if (error instanceof BaseError)
            return {
                status: SubmitterError.RpcError,
                description: error.message,
            }

        return {
            status: SubmitterError.UnexpectedError,
            description: extractErrorMessage(error),
        }
    }

    // TODO Think about the fact all that follows is moot for simulate.
    //      Correctness is guaranteed, but maybe we want to isolate the above for a bit of a nicer flow?

    switch (decoded?.errorName) {
        case "InvalidNonce": {
            // We don't necessarily need to reset the nonce here in simulation, but we do it to be safe.
            boopNonceManager.resetLocalNonce(boop)
            return {
                status: Onchain.InvalidNonce,
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
            console.log(raw)
            return {
                status: Onchain.ValidationReverted,
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
                        status: Onchain.InvalidSignature,
                        description: "Account rejected the boop because of an invalid signature",
                    }
                case "InvalidExtensionValue":
                    return {
                        status: Onchain.InvalidExtensionValue,
                        description: "Account rejected the boop because an extension value in the extraData is invalid",
                    }
                case "UnknownDuringSimulation": {
                    logger.error("escaped UnknownDuringSimulation — BIG BUG")
                }
            }
            return {
                status: Onchain.ValidationRejected,
                // TODO provide a utility function for this
                description: "Account rejected the boop, try parsing the revertData to see why",
                revertData: decoded.args[0] as Hex,
            }
        }
        case "PaymentValidationReverted": {
            return {
                status: Onchain.PaymentValidationReverted,
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
                description: "Paymaster rejected the boop, try parsing the revertData to see why",
                revertData: decoded.args[0] as Hex,
            }
        }
        case "GasPriceTooHigh": {
            if (simulation) {
                logger.error("escape GasPriceTooHigh during simulation — BIG BUG", boopHash)
                return {
                    status: Onchain.UnexpectedReverted,
                    description: "GasPriceTooHigh during simulation — this is an implementation bug, please report!",
                }
            } else {
                return {
                    status: Onchain.GasPriceTooHigh,
                    description:
                        "The boop got rejected because the gas price was above the maxFeePerGas.\n" +
                        "Try again, with a higher maxFeePerGas if you are setting it manually.",
                }
            }
        }
        case "MalformedBoop": {
            return {
                status: Onchain.UnexpectedReverted,
                description: `${decoded.errorName} during simulation — this is an implementation bug, please report!`,
            }
        }
        default: {
            // In theory, OOG is the only way the entrypoint can revert that we haven't parsed yet.
            logger.error("Got unexpected revert error during simulation, most likely out of gas", {})
            return {
                status: Onchain.UnexpectedReverted,
            }
        }
        // TODO later: extension stuff
    }
}
