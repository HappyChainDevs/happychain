// Error codes
export { RpcErrorCodes } from "./eip-1474-codes"

// Error objects and types
export type { EIP1474ErrorObject, EIP1474ErrorParams } from "./eip-1474-interfaces"

// Error classes
export {
    GenericJsonRpcError,
    JsonRpcParseError,
    JsonRpcInvalidRequestError,
    JsonRpcMethodNotFoundError,
    JsonRpcInvalidParamsError,
    JsonRpcInternalError,
    JsonRpcInvalidInputError,
    JsonRpcResourceNotFoundError,
    JsonRpcResourceUnavailableError,
    JsonRpcTransactionRejectedError,
    JsonRpcMethodNotSupportedError,
    JsonRpcLimitExceededError,
    JsonRpcVersionNotSupportedError,
    JsonRpcDuplicateMethodNotFoundError,
    UnknownError,
} from "./eip-1474-errors"

export {
    getEIP1474ErrorObjectFromCode,
    getEIP1474ErrorObjectFromUnknown,
} from "./eip-1474-utils"
