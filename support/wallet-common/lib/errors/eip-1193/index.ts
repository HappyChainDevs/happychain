// Error codes
export { EIP1193ProviderErrorCodes } from "./eip-1193-codes"

// Error objects and types
export type { EIP1193ErrorObject, ProviderRpcErrorCode } from "./eip-1193-interfaces"

// Error classes
export {
    GenericProviderRpcError,
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
    EIP1193DisconnectedError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
} from "./eip-1193-errors"

// Utility functions
export {
    getEIP1193ErrorObjectFromCode,
    getEIP1193ErrorObjectFromUnknown,
} from "./eip-1193-utils"
