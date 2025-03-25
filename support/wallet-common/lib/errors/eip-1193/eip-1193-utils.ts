import {
    ChainDisconnectedError,
    ProviderDisconnectedError,
    SwitchChainError,
    UnauthorizedProviderError,
    UnsupportedProviderMethodError,
    UserRejectedRequestError,
} from "viem"
import { RpcErrorCodes } from "../eip-1474"
import { EIP1193ProviderErrorCodes } from "./eip-1193-codes"
import {
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
    EIP1193DisconnectedError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
    GenericProviderRpcError,
} from "./eip-1193-errors"
import type { EIP1193ErrorObject } from "./eip-1193-interfaces"

/**
 * Given (at minimum) the error code, this creates an error object with a standard description.
 *
 * @param code number (EIP1193 error code)
 * @param data optional data to enhance debugging
 * @returns serializable error object
 */
export function getEIP1193ErrorObjectFromCode(code: number, data?: string): EIP1193ErrorObject {
    switch (code) {
        case EIP1193ProviderErrorCodes.UserRejectedRequest:
            return { code, message: "The user rejected the request.", data }
        case EIP1193ProviderErrorCodes.Unauthorized:
            return { code, message: "The requested method and/or account has not been authorized by the user.", data }
        case EIP1193ProviderErrorCodes.UnsupportedMethod:
            return { code, message: "The Provider does not support the requested method.", data }
        case EIP1193ProviderErrorCodes.Disconnected:
            return { code, message: "The Provider is disconnected from all chains.", data }
        case EIP1193ProviderErrorCodes.ChainDisconnected:
            return { code, message: "The Provider is not connected to the requested chain.", data }
        case EIP1193ProviderErrorCodes.SwitchChainError:
            return { code, message: "An error occurred when attempting to switch chains.", data }
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
export function getEIP1193ErrorObjectFromUnknown(error: unknown): EIP1193ErrorObject {
    if (error instanceof UserRejectedRequestError) {
        return getEIP1193ErrorObjectFromCode(EIP1193ProviderErrorCodes.UserRejectedRequest, error.details)
    }
    if (error instanceof UnauthorizedProviderError) {
        return getEIP1193ErrorObjectFromCode(EIP1193ProviderErrorCodes.Unauthorized, error.details)
    }
    if (error instanceof UnsupportedProviderMethodError) {
        return getEIP1193ErrorObjectFromCode(EIP1193ProviderErrorCodes.UnsupportedMethod, error.details)
    }
    if (error instanceof ProviderDisconnectedError) {
        return getEIP1193ErrorObjectFromCode(EIP1193ProviderErrorCodes.Disconnected, error.details)
    }
    if (error instanceof ChainDisconnectedError) {
        return getEIP1193ErrorObjectFromCode(EIP1193ProviderErrorCodes.ChainDisconnected, error.details)
    }
    if (error instanceof SwitchChainError) {
        return getEIP1193ErrorObjectFromCode(EIP1193ProviderErrorCodes.SwitchChainError, error.details)
    }
    if (error instanceof GenericProviderRpcError) {
        return getEIP1193ErrorObjectFromCode(error.code, error.message)
    }

    let data = ""
    if (typeof error === "string") {
        data = error
    } else if (!error || typeof error !== "object") {
        // empty - skip
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
    const errorCode = (error as any)?.code ?? RpcErrorCodes.Unknown
    return getEIP1193ErrorObjectFromCode(errorCode, data)
}

/**
 * Given a serializable eip 1193 error object, this returns an initialized Error of the matching type
 *
 * @param error serializable error object
 * @returns EIP1193 Error
 */
export function convertEIP1193ErrorObjectToErrorInstance(error: EIP1193ErrorObject) {
    switch (error.code) {
        case EIP1193ProviderErrorCodes.UserRejectedRequest:
            return new EIP1193UserRejectedRequestError(error as EIP1193ErrorObject)
        case EIP1193ProviderErrorCodes.Unauthorized:
            return new EIP1193UnauthorizedError(error as EIP1193ErrorObject)
        case EIP1193ProviderErrorCodes.UnsupportedMethod:
            return new EIP1193UnsupportedMethodError(error as EIP1193ErrorObject)
        case EIP1193ProviderErrorCodes.Disconnected:
            return new EIP1193DisconnectedError(error as EIP1193ErrorObject)
        case EIP1193ProviderErrorCodes.ChainDisconnected:
            return new EIP1193ChainDisconnectedError(error as EIP1193ErrorObject)
        case EIP1193ProviderErrorCodes.SwitchChainError:
            return new EIP1193ChainNotRecognizedError(error as EIP1193ErrorObject)
        default:
            return new GenericProviderRpcError(error)
    }
}
