export { OverlayErrorCode } from "./overlay-errors"

export {
    getEIP1193ErrorObjectFromCode,
    getEIP1193ErrorObjectFromUnknown,
} from "./eip-1193-utils"

export {
    GenericProviderRpcError,
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
    EIP1193DisconnectedError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
} from "./eip-1193-errors"

export { EIP1193ErrorCodes } from "./eip-1193-codes"

export type { EIP1193ErrorObject, ProviderRpcErrorCode } from "./eip-1193-interfaces"

export { LoginRequiredError } from "./happy-provider-errors"

export { EIP1474ErrorCodes, GenericEthereumRpcError, EIP1474InvalidInput } from "./eip-1474-errors"
