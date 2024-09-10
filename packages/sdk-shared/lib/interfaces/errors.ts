import type { ProviderRpcErrorCode as ViemProviderRpcErrorCode } from "viem"
import {
    ChainDisconnectedError,
    ProviderDisconnectedError,
    SwitchChainError,
    UnauthorizedProviderError,
    UnsupportedProviderMethodError,
    UserRejectedRequestError,
} from "viem"

/**
 * Standard EIP 1193 Error Codes
 */
export enum EIP1193ErrorCodes {
    UserRejectedRequest = 4001,
    Unauthorized = 4100,
    UnsupportedMethod = 4200,
    Disconnected = 4900,
    ChainDisconnected = 4901,
    ChainNotRecognized = 4902, // non-standard, supported by viem
    Unknown = -1,
}

/**
 * We will use -1 to signify unknown error types.
 */
type ProviderRpcErrorCode = ViemProviderRpcErrorCode | -1

/**
 * Error Object is used to transmit error messages
 * across MessageChannel and BroadcastChannels.
 * This requires the data to be JSON serializable
 * so we can't send the raw Error class
 */
export type EIP1193ErrorObject = {
    code: ProviderRpcErrorCode
    message: string
    data?: unknown
}

/**
 * Interface from EIP1193
 * https://eips.ethereum.org/EIPS/eip-1193#errors
 */
export interface IProviderRpcError extends Error {
    message: string
    code: ProviderRpcErrorCode
    data?: unknown
}

/**
 * General Purpose Provider RPC error.
 * Can be instantiated from the deserialized ErrorObject
 */
export class GenericProviderRpcError extends Error {
    code: ProviderRpcErrorCode
    data?: unknown
    constructor(errObj: EIP1193ErrorObject) {
        super(errObj.message)
        this.code = errObj.code
        this.data = errObj.data

        // as the iframe error is thrown from within the iframe
        // the stack trace is not particularly helpful here.
        // and just exposes the workings of the internal
        // events system.
        this.stack = undefined
    }
}

// === EIP1193 Specific Errors =========================================================================

/**
 * Error: 4001 User Rejected Request
 */
export class EIP1193UserRejectedRequestError extends GenericProviderRpcError {
    constructor(errObj?: EIP1193ErrorObject) {
        super({
            code: EIP1193ErrorCodes.UserRejectedRequest,
            message: errObj?.message || "User Rejected Request",
            data: errObj?.data || "User Rejected Request",
        })
    }
}

/**
 * Error: 4100 Unauthorized
 */
export class EIP1193UnauthorizedError extends GenericProviderRpcError {
    constructor(errObj?: EIP1193ErrorObject) {
        super({
            code: EIP1193ErrorCodes.Unauthorized,
            message: errObj?.message || "Unauthorized",
            data: errObj?.data || "Unauthorized",
        })
    }
}

/**
 * Error: 4200 Unsupported Method
 */
export class EIP1193UnsupportedMethodError extends GenericProviderRpcError {
    constructor(errObj?: EIP1193ErrorObject) {
        super({
            code: EIP1193ErrorCodes.UnsupportedMethod,
            message: errObj?.message || "Unsupported Method",
            data: errObj?.data || "Unsupported Method",
        })
    }
}

/**
 * Error: 4900 Provider Disconnected
 */
export class EIP1193DisconnectedError extends GenericProviderRpcError {
    constructor(errObj?: EIP1193ErrorObject) {
        super({
            code: EIP1193ErrorCodes.Disconnected,
            message: errObj?.message || "Disconnected",
            data: errObj?.data || "Disconnected",
        })
    }
}

/**
 * Error: 4901 Chain Disconnected
 */
export class EIP1193ChainDisconnectedError extends GenericProviderRpcError {
    constructor(errObj?: EIP1193ErrorObject) {
        super({
            code: EIP1193ErrorCodes.ChainDisconnected,
            message: errObj?.message || "Chain Disconnected",
            data: errObj?.data || "Chain Disconnected",
        })
    }
}

/**
 * Error: 4902 Chain Not Recognized
 */
export class EIP1193ChainNotRecognizedError extends GenericProviderRpcError {
    constructor(errObj?: EIP1193ErrorObject) {
        super({
            code: EIP1193ErrorCodes.ChainNotRecognized,
            message: errObj?.message || "Chain Not Recognized",
            data: errObj?.data || "Chain Not Recognized",
        })
    }
}

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
export function getEIP1193ErrorObjectFromUnknown(error: unknown): EIP1193ErrorObject {
    if (error instanceof UserRejectedRequestError) {
        return getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.UserRejectedRequest, error.details)
    }
    if (error instanceof UnauthorizedProviderError) {
        return getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.Unauthorized, error.details)
    }
    if (error instanceof UnsupportedProviderMethodError) {
        return getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.UnsupportedMethod, error.details)
    }
    if (error instanceof ProviderDisconnectedError) {
        return getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.Disconnected, error.details)
    }
    if (error instanceof ChainDisconnectedError) {
        return getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.ChainDisconnected, error.details)
    }
    if (error instanceof SwitchChainError) {
        return getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.ChainNotRecognized, error.details)
    }

    const data =
        !error || typeof error !== "object"
            ? ""
            : "details" in error && typeof error.details === "string"
              ? error.details
              : "shortMessage" in error && typeof error.shortMessage === "string"
                ? error.shortMessage
                : ""

    return getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.Unknown, data)
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
        case EIP1193ErrorCodes.ChainNotRecognized:
            return new EIP1193ChainNotRecognizedError(error as EIP1193ErrorObject)
        default:
            return new GenericProviderRpcError(error)
    }
}
