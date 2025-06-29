export { HappyRpcError } from "./HappyRpcError"

export {
    serializeRpcError,
    parseRpcError,
    standardizeRpcError,
    type SerializedRpcError,
} from "./serialize"

export {
    ProviderRpcError,
    EIP1193ChainDisconnectedError,
    EIP1193SwitchChainError,
    EIP1193DisconnectedError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
    EIP1193ErrorCodes,
} from "./eip1193Errors"

export {
    EthereumRpcError,
    EIP1474ErrorCodes,
    EIP1474InvalidInput,
    EIP1474InternalError,
    EIP1474TransactionRejected,
    EIP1474LimitExceeded,
    EIP1474ResourceNotfound,
} from "./eip1474Errors"

export { RevertErrorCode, RevertRpcError } from "./revertError"

export { LoginRequiredError } from "./internalErrors"

export { OverlayErrorCode } from "./overlayErrors"
