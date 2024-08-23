export {
    GenericProviderRpcError,
    EIP1193UserRejectedRequestError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193DisconnectedError,
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
} from "./errors"

export type { EIP1193ErrorObject, IProviderRpcError } from "./errors"

export type {
    EventUUID,
    EIP1193RequestArg,
    EIP1193RequestResult,
    EIP1193EventName,
    EIP1193ProxiedEvents,
} from "./events"
