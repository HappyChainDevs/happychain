import { RpcErrorCodes } from "./eip-1474-codes"
import {
    GenericJsonRpcError,
    JsonRpcInternalError,
    JsonRpcInvalidInputError,
    JsonRpcInvalidParamsError,
    JsonRpcInvalidRequestError,
    JsonRpcLimitExceededError,
    JsonRpcMethodNotFoundError,
    JsonRpcMethodNotSupportedError,
    JsonRpcParseError,
    JsonRpcResourceNotFoundError,
    JsonRpcResourceUnavailableError,
    JsonRpcTransactionRejectedError,
    JsonRpcVersionNotSupportedError,
    UnknownError,
} from "./eip-1474-errors"
import type { EIP1474ErrorObject, EIP1474ErrorParams } from "./eip-1474-interfaces"

/**
 * Create an EIP1474 error object from an error code and optional message and data
 */
export function getEIP1474ErrorObjectFromCode(
    code: RpcErrorCodes,
    message?: string,
    data?: unknown,
): EIP1474ErrorObject {
    const params: EIP1474ErrorParams = { code, message: message || "", data }
    return createErrorFromParams(params).toErrorObject()
}

/**
 * Attempt to convert an unknown error into an EIP1474 error object
 */
export function getEIP1474ErrorObjectFromUnknown(
    error: unknown,
    defaultMessage = "Unknown error occurred",
): EIP1474ErrorObject {
    // If it's already a GenericJsonRpcError, use it directly
    if (error instanceof GenericJsonRpcError) {
        return error.toErrorObject()
    }

    // If it's a standard Error, use its message
    if (error instanceof Error) {
        return getEIP1474ErrorObjectFromCode(RpcErrorCodes.InternalError, error.message || defaultMessage)
    }

    // If it's an error-like object with code and message
    if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "number") {
        const errObj = error as { code: number; message?: string; data?: unknown }
        return getEIP1474ErrorObjectFromCode(errObj.code, errObj.message || defaultMessage, errObj.data)
    }

    // Default case: wrap in a generic internal error
    return getEIP1474ErrorObjectFromCode(
        RpcErrorCodes.InternalError,
        typeof error === "string" ? error : defaultMessage,
    )
}

/**
 * Create the appropriate error class based on the error code
 */
export function createErrorFromParams(params: EIP1474ErrorParams): GenericJsonRpcError {
    switch (params.code) {
        case RpcErrorCodes.ParseError:
            return new JsonRpcParseError(params.message, params.data)
        case RpcErrorCodes.InvalidRequest:
            return new JsonRpcInvalidRequestError(params.message, params.data)
        case RpcErrorCodes.MethodNotFound:
        case RpcErrorCodes.DuplicateMethodNotFound:
            return new JsonRpcMethodNotFoundError(params.message, params.data)
        case RpcErrorCodes.InvalidParams:
            return new JsonRpcInvalidParamsError(params.message, params.data)
        case RpcErrorCodes.InternalError:
            return new JsonRpcInternalError(params.message, params.data)
        case RpcErrorCodes.InvalidInput:
            return new JsonRpcInvalidInputError(params.message, params.data)
        case RpcErrorCodes.ResourceNotFound:
            return new JsonRpcResourceNotFoundError(params.message, params.data)
        case RpcErrorCodes.ResourceUnavailable:
            return new JsonRpcResourceUnavailableError(params.message, params.data)
        case RpcErrorCodes.TransactionRejected:
            return new JsonRpcTransactionRejectedError(params.message, params.data)
        case RpcErrorCodes.MethodNotSupported:
            return new JsonRpcMethodNotSupportedError(params.message, params.data)
        case RpcErrorCodes.LimitExceeded:
            return new JsonRpcLimitExceededError(params.message, params.data)
        case RpcErrorCodes.JsonRpcVersionNotSupported:
            return new JsonRpcVersionNotSupportedError(params.message, params.data)
        default:
            return new UnknownError(params.message, params.data)
    }
}
