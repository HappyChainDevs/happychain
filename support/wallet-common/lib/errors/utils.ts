import { EIP1193ErrorCodes } from "./codes"
import {
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
    EIP1193DisconnectedError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
    GenericProviderRpcError,
} from "./errors"
import type { EIP1193ErrorObject } from "./interfaces"

/**
 * given (at minimum) the error code, this creates an error object with a standard description
 *
 * @param code number (eip 1193 error code)
 * @param data optional data to enhance debugging
 * @returns serializable error object
 */
export function getEIP1193ErrorObjectFromCode(code: number, data?: string): EIP1193ErrorObject {
    switch (code) {
        case EIP1193ErrorCodes.UserRejectedRequest:
            return { code, message: "The user rejected the request.", data }
        case EIP1193ErrorCodes.Unauthorized:
            return { code, message: "The requested method and/or account has not been authorized by the user.", data }
        case EIP1193ErrorCodes.UnsupportedMethod:
            return { code, message: "The Provider does not support the requested method.", data }
        case EIP1193ErrorCodes.Disconnected:
            return { code, message: "The Provider is disconnected from all chains.", data }
        case EIP1193ErrorCodes.ChainDisconnected:
            return { code, message: "The Provider is not connected to the requested chain.", data }
        case 4902:
            return { code, message: "An error occurred when attempting to switch chain.", data }
        default:
            return { code: -1, message: "An unknown RPC error occurred.", data }
    }
}

/**
 * Converts an unknown error - such as from `try {} catch(e) {}` - into our serializable
 * error object ready to be transmitted between app<->iframe
 *
 * @param error unknown
 * @returns EIP1193ErrorObject
 */
type ViemLikeError = { code: number; details: string }
const isViemErrorFormat = (error: unknown): error is ViemLikeError =>
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "number" &&
    "details" in error &&
    typeof error.details === "string"

const knownErrorCodes = [
    EIP1193ErrorCodes.UserRejectedRequest,
    EIP1193ErrorCodes.Unauthorized,
    EIP1193ErrorCodes.UnsupportedMethod,
    EIP1193ErrorCodes.Disconnected,
    EIP1193ErrorCodes.ChainDisconnected,
    EIP1193ErrorCodes.SwitchChainError,
]
export function getEIP1193ErrorObjectFromUnknown(error: unknown): EIP1193ErrorObject {
    if (isViemErrorFormat(error) && knownErrorCodes.includes(error.code)) {
        return getEIP1193ErrorObjectFromCode(error.code, error.details)
    }

    if (isViemErrorFormat(error) && "message" in error && typeof error.message === "string") {
        return getEIP1193ErrorObjectFromCode(error.code, error.message)
    }

    let data = ""
    if (!error || typeof error !== "object") {
    } else if ("details" in error && typeof error.details === "string") {
        data = error.details
    } else if ("shortMessage" in error && typeof error.shortMessage === "string") {
        data = error.shortMessage
    } else if ("message" in error && typeof error.message === "string") {
        data = error.message
    } else if ("toString" in error && typeof error.toString === "function") {
        data = error.toString()
    }

    // biome-ignore lint/suspicious/noExplicitAny: error can be anything
    const errorCode = (error as any)?.code ?? EIP1193ErrorCodes.Unknown
    return getEIP1193ErrorObjectFromCode(errorCode, data)
}

/**
 * Given a serializable eip 1193 error object, this returns an initialized Error of the matching type
 *
 * @param error serializable error object
 * @returns EIP1193 Error
 */
export function convertErrorObjectToEIP1193ErrorInstance(error: EIP1193ErrorObject) {
    switch (error.code) {
        case EIP1193ErrorCodes.UserRejectedRequest:
            return new EIP1193UserRejectedRequestError(error as EIP1193ErrorObject)
        case EIP1193ErrorCodes.Unauthorized:
            return new EIP1193UnauthorizedError(error as EIP1193ErrorObject)
        case EIP1193ErrorCodes.UnsupportedMethod:
            return new EIP1193UnsupportedMethodError(error as EIP1193ErrorObject)
        case EIP1193ErrorCodes.Disconnected:
            return new EIP1193DisconnectedError(error as EIP1193ErrorObject)
        case EIP1193ErrorCodes.ChainDisconnected:
            return new EIP1193ChainDisconnectedError(error as EIP1193ErrorObject)
        case EIP1193ErrorCodes.SwitchChainError:
            return new EIP1193ChainNotRecognizedError(error as EIP1193ErrorObject)
        default:
            return new GenericProviderRpcError(error)
    }
}
