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
 * We will use -1 to signify unknown error typews
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

/**
 * EIP1193 Specific Errors
 */
export class EIP1193UserRejectedRequestError extends GenericProviderRpcError {
    constructor(errObj?: EIP1193ErrorObject) {
        super({
            code: 4001,
            message: errObj?.message || "User Rejected Request",
            data: errObj?.data || "User Rejected Request",
        })
    }
}

export class EIP1193UnauthorizedError extends GenericProviderRpcError {
    constructor(errObj?: EIP1193ErrorObject) {
        super({
            code: 4100,
            message: errObj?.message || "Unauthorized",
            data: errObj?.data || "Unauthorized",
        })
    }
}
export class EIP1193UnsupportedMethodError extends GenericProviderRpcError {
    constructor(errObj?: EIP1193ErrorObject) {
        super({
            code: 4200,
            message: errObj?.message || "Unsupported Method",
            data: errObj?.data || "Unsupported Method",
        })
    }
}
export class EIP1193DisconnectedError extends GenericProviderRpcError {
    constructor(errObj?: EIP1193ErrorObject) {
        super({
            code: 4900,
            message: errObj?.message || "Disconnected",
            data: errObj?.data || "Disconnected",
        })
    }
}
export class EIP1193ChainDisconnectedError extends GenericProviderRpcError {
    constructor(errObj?: EIP1193ErrorObject) {
        super({
            code: 4901,
            message: errObj?.message || "Chain Disconnected",
            data: errObj?.data || "Chain Disconnected",
        })
    }
}
export class EIP1193ChainNotRecognizedError extends GenericProviderRpcError {
    constructor(errObj?: EIP1193ErrorObject) {
        super({
            code: 4902,
            message: errObj?.message || "Chain Not Recognized",
            data: errObj?.data || "Chain Not Recognized",
        })
    }
}

export function getEIP1193ErrorObjectFromCode(code: number, data?: string): EIP1193ErrorObject {
    switch (code) {
        case 4001:
            return { code, message: "The user rejected the request.", data }
        case 4100:
            return { code, message: "The requested method and/or account has not been authorized by the user.", data }
        case 4200:
            return { code, message: "The Provider does not support the requested method.", data }
        case 4900:
            return { code, message: "The Provider is disconnected from all chains.", data }
        case 4901:
            return { code, message: "The Provider is not connected to the requested chain.", data }
        case 4902:
            return { code, message: "An error occurred when attempting to switch chain.", data }
        default:
            return { code: -1, message: "An unknown RPC error occurred.", data }
    }
}

export function getEIP1193ErrorObjectFromUnknown(error: unknown): EIP1193ErrorObject {
    if (error instanceof UserRejectedRequestError) {
        return getEIP1193ErrorObjectFromCode(4001, error.details)
    }
    if (error instanceof UnauthorizedProviderError) {
        return getEIP1193ErrorObjectFromCode(4100, error.details)
    }
    if (error instanceof UnsupportedProviderMethodError) {
        return getEIP1193ErrorObjectFromCode(4200, error.details)
    }
    if (error instanceof ProviderDisconnectedError) {
        return getEIP1193ErrorObjectFromCode(4900, error.details)
    }
    if (error instanceof ChainDisconnectedError) {
        return getEIP1193ErrorObjectFromCode(4901, error.details)
    }
    if (error instanceof SwitchChainError) {
        return getEIP1193ErrorObjectFromCode(4902, error.details)
    }

    const data =
        !error || typeof error !== "object"
            ? ""
            : "details" in error && typeof error.details === "string"
              ? error.details
              : "shortMessage" in error && typeof error.shortMessage === "string"
                ? error.shortMessage
                : ""

    return getEIP1193ErrorObjectFromCode(-1, data)
}

export function convertErrorObjectToEIP1193ErrorInstance(error: EIP1193ErrorObject) {
    switch (error.code) {
        case 4001:
            return new EIP1193UserRejectedRequestError(error as EIP1193ErrorObject)
        case 4100:
            return new EIP1193UnauthorizedError(error as EIP1193ErrorObject)
        case 4200:
            return new EIP1193UnsupportedMethodError(error as EIP1193ErrorObject)
        case 4900:
            return new EIP1193DisconnectedError(error as EIP1193ErrorObject)
        case 4901:
            return new EIP1193ChainDisconnectedError(error as EIP1193ErrorObject)
        case 4902:
            return new EIP1193ChainNotRecognizedError(error as EIP1193ErrorObject)
        default:
            return new GenericProviderRpcError(error)
    }
}
