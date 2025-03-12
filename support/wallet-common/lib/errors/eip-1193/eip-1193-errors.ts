import { EIP1193ProviderErrorCodes } from "./eip-1193-codes"
import type { EIP1193ErrorObject, ProviderRpcErrorCode } from "./eip-1193-interfaces"

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
    }
}

// === EIP1193 Specific Errors =========================================================================

/**
 * Error: 4001 User Rejected Request
 */
export class EIP1193UserRejectedRequestError extends GenericProviderRpcError {
    constructor(errObj?: EIP1193ErrorObject) {
        super({
            code: EIP1193ProviderErrorCodes.UserRejectedRequest,
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
            code: EIP1193ProviderErrorCodes.Unauthorized,
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
            code: EIP1193ProviderErrorCodes.UnsupportedMethod,
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
            code: EIP1193ProviderErrorCodes.Disconnected,
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
            code: EIP1193ProviderErrorCodes.ChainDisconnected,
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
            code: EIP1193ProviderErrorCodes.SwitchChainError,
            message: errObj?.message || "Chain Not Recognized",
            data: errObj?.data || "Chain Not Recognized",
        })
    }
}
