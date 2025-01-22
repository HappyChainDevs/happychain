export {
    getEIP1193ErrorObjectFromCode,
    getEIP1193ErrorObjectFromUnknown,
} from "./utils"

export {
    GenericProviderRpcError,
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
    EIP1193DisconnectedError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
} from "./errors"

export { EIP1193ErrorCodes } from "./codes"

export type { EIP1193ErrorObject, IProviderRpcError, ProviderRpcErrorCode } from "./interfaces"
