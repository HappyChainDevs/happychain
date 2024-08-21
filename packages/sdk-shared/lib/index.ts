export { config } from "./config"
export { logger } from "./services/logger"

export { permissionsLists, requiresApproval } from "./services/permissions"

export * as chains from "./chains"

export { EventBus, EventBusChannel } from "./services/eventBus"
export {
    GenericProviderRpcError,
    EIP1193UserRejectedRequestError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193DisconnectedError,
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
    getEIP1193ErrorObjectFromUnknown,
} from "./services/eip1193Provider/errors"

/** Types */
export type { HappyEvents } from "./interfaces/events"
export type { HappyUser } from "./interfaces/happyUser"
export type { Logger } from "./services/logger"
export type {
    EventPayload,
    EventKey,
    EventHandler,
    EventSchema,
    EventMap,
    IEventBus,
    EventBusOptions,
} from "./services/eventBus"
export type {
    EventUUID,
    EIP1193RequestArg,
    EIP1193RequestResult,
    EIP1193EventName,
    EIP1193ProxiedEvents,
} from "./services/eip1193Provider/events"
export type { EIP1193ErrorObject, IProviderRpcError } from "./services/eip1193Provider/errors"
export type {
    EIP6963ProviderInfo,
    EIP6963ProviderDetail,
    EIP6963AnnounceProviderEvent,
    ConnectionProvider,
} from "./interfaces/eip1193Provider"
