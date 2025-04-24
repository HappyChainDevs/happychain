export { OverlayErrorCode } from "./overlay-errors"

export {
    getEIP1193ErrorObjectFromCode,
    getEIP1193ErrorObjectFromUnknown,
} from "./eip-1193-utils"

export {
    ProviderRpcError,
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
    EIP1193DisconnectedError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
    EIP1193ErrorCodes,
    type EIP1193ErrorObject,
} from "./eip-1193-errors"

export { LoginRequiredError } from "./happy-provider-errors"

export { EIP1474ErrorCodes, EthereumRpcError, EIP1474InvalidInput, EIP1474InternalError } from "./eip-1474-errors"
