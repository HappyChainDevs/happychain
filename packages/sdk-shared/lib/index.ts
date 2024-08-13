export { config } from './config'
export { logger } from './services/logger'
export { onUserUpdate, onModalUpdate, happyProvider } from './initialize'
export { EventBus, EventBusChannel } from './services/eventBus'
export {
    HappyProvider,
    GenericProviderRpcError,
    EIP1193UserRejectedRequestError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193DisconnectedError,
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
} from './services/eip1193ProviderProxy'

/** Types */
export type { HappyEvents } from './interfaces/events'
export type { HappyUser } from './interfaces/happyUser'
export type { Logger } from './services/logger'
export type {
    EventPayload,
    EventKey,
    EventHandler,
    EventSchema,
    EventMap,
    IEventBus,
    EventBusOptions,
} from './services/eventBus'
export type {
    EIP1193ErrorObject,
    IProviderRpcError,
    EventUUID,
    EIP1193RequestArg,
    EIP1193RequestResult,
    EIP1193EventName,
    EIP1193ProxiedEvents,
} from './services/eip1193ProviderProxy'
export type {
    EIP6963ProviderInfo,
    EIP6963ProviderDetail,
    EIP6963AnnounceProviderEvent,
    ConnectionProvider,
} from './interfaces/eip1193Provider'
