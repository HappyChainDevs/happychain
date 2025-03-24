// === JSON-RPC Specific Errors ========================================================================

import { RpcErrorCodes } from "./eip-1474-codes"
import type { EIP1474ErrorObject, EIP1474ErrorParams } from "./eip-1474-interfaces"

/**
 * General Purpose JSON-RPC error.
 * Can be instantiated from the deserialized ErrorObject
 */
export class GenericJsonRpcError extends Error {
    code: RpcErrorCodes
    data?: unknown

    constructor(errParams: EIP1474ErrorParams) {
        super(errParams.message)
        this.code = errParams.code
        this.data = errParams.data
    }

    /**
     * Create an error instance from a full EIP1474ErrorObject.
     */
    static fromErrorObject(errObj: EIP1474ErrorObject): GenericJsonRpcError {
        return new GenericJsonRpcError({
            code: errObj.error.code,
            message: errObj.error.message,
            data: errObj.error.data,
        })
    }

    /**
     * Convert this error to a standardized EIP1474ErrorObject
     */
    toErrorObject(id: number | string | null = null): EIP1474ErrorObject {
        return {
            id,
            jsonrpc: "2.0",
            error: {
                code: this.code,
                message: this.message,
                data: this.data,
            },
        }
    }
}

/**
 * Error: -32700 Parse Error
 */
export class JsonRpcParseError extends GenericJsonRpcError {
    constructor(message?: string, data?: unknown) {
        super({
            code: RpcErrorCodes.ParseError,
            message: message || "Invalid JSON",
            data: data || "The request couldn't be parsed as valid JSON",
        })
    }
}

/**
 * Error: -32600 Invalid Request
 */
export class JsonRpcInvalidRequestError extends GenericJsonRpcError {
    constructor(message?: string, data?: unknown) {
        super({
            code: RpcErrorCodes.InvalidRequest,
            message: message || "Invalid request",
            data: data || "The request structure is invalid",
        })
    }
}

/**
 * Error: -32601 Method Not Found
 */
export class JsonRpcMethodNotFoundError extends GenericJsonRpcError {
    constructor(message?: string, data?: unknown) {
        super({
            code: RpcErrorCodes.MethodNotFound,
            message: message || "Method not found",
            data: data || "The requested operation is not supported",
        })
    }
}

/**
 * Error: -32602 Invalid Params
 */
export class JsonRpcInvalidParamsError extends GenericJsonRpcError {
    constructor(message?: string, data?: unknown) {
        super({
            code: RpcErrorCodes.InvalidParams,
            message: message || "Invalid parameters",
            data: data || "The request contains incorrect parameters",
        })
    }
}

/**
 * Error: -32603 Internal Error
 */
export class JsonRpcInternalError extends GenericJsonRpcError {
    constructor(message?: string, data?: unknown) {
        super({
            code: RpcErrorCodes.InternalError,
            message: message || "Internal error",
            data: data || "The server encountered an unexpected error",
        })
    }
}

/**
 * Error: -32000 Invalid Input
 */
export class JsonRpcInvalidInputError extends GenericJsonRpcError {
    constructor(message?: string, data?: unknown) {
        super({
            code: RpcErrorCodes.InvalidInput,
            message: message || "Invalid input data",
            data: data || "The data you provided is invalid or incomplete",
        })
    }
}

/**
 * Error: -32001 Resource Not Found
 */
export class JsonRpcResourceNotFoundError extends GenericJsonRpcError {
    constructor(message?: string, data?: unknown) {
        super({
            code: RpcErrorCodes.ResourceNotFound,
            message: message || "Resource not found",
            data: data || "The requested data doesn't exist",
        })
    }
}

/**
 * Error: -32002 Resource Unavailable
 */
export class JsonRpcResourceUnavailableError extends GenericJsonRpcError {
    constructor(message?: string, data?: unknown) {
        super({
            code: RpcErrorCodes.ResourceUnavailable,
            message: message || "Resource unavailable",
            data: data || "The requested resource is currently unavailable",
        })
    }
}

/**
 * Error: -32003 Transaction Rejected
 */
export class JsonRpcTransactionRejectedError extends GenericJsonRpcError {
    constructor(message?: string, data?: unknown) {
        super({
            code: RpcErrorCodes.TransactionRejected,
            message: message || "Transaction rejected",
            data: data || "The transaction was rejected by the network",
        })
    }
}

/**
 * Error: -32004 Method Not Supported
 */
export class JsonRpcMethodNotSupportedError extends GenericJsonRpcError {
    constructor(message?: string, data?: unknown) {
        super({
            code: RpcErrorCodes.MethodNotSupported,
            message: message || "Method not supported",
            data: data || "This operation is not supported by the current provider",
        })
    }
}

/**
 * Error: -32005 Limit Exceeded
 */
export class JsonRpcLimitExceededError extends GenericJsonRpcError {
    constructor(message?: string, data?: unknown) {
        super({
            code: RpcErrorCodes.LimitExceeded,
            message: message || "Rate limit exceeded",
            data: data || "Too many requests. Please try again later",
        })
    }
}

/**
 * Error: -32006 JSON-RPC Version Not Supported
 */
export class JsonRpcVersionNotSupportedError extends GenericJsonRpcError {
    constructor(message?: string, data?: unknown) {
        super({
            code: RpcErrorCodes.JsonRpcVersionNotSupported,
            message: message || "RPC version not supported",
            data: data || "The requested JSON-RPC version is not supported",
        })
    }
}

/**
 * Error: -32042 Method Not Found (Duplicate code)
 */
export class JsonRpcDuplicateMethodNotFoundError extends GenericJsonRpcError {
    constructor(message?: string, data?: unknown) {
        super({
            code: RpcErrorCodes.DuplicateMethodNotFound,
            message: message || "Method not available",
            data: data || "The requested method is not available",
        })
    }
}

/**
 * Error: -1 Unknown Error
 * Default error for unspecified cases
 */
export class UnknownError extends GenericJsonRpcError {
    constructor(message?: string, data?: unknown) {
        super({
            code: RpcErrorCodes.Unknown,
            message: message || "Unknown error",
            data: data || "An unexpected error occurred",
        })
    }
}
