export { config } from './config'

export type {
    EIP6963ProviderInfo,
    EIP6963ProviderDetail,
    EIP6963AnnounceProviderEvent,
    ConnectionProvider,
} from './interfaces/eip1193Provider'
export type { HappyEvents } from './interfaces/events'
export type { HappyUser } from './interfaces/happyUser'

export type {
    EventPayload,
    EventKey,
    EventHandler,
    EventSchema,
    EventMap,
    EventBus,
    EventBusOptions,
} from './services/eventBus/eventBus'

export { eventBus, EventBusChannel } from './services/eventBus/eventBus'
// export * from './services/eventBus/eventBus'

export type {
    EventUUID,
    EIP1193ErrorObject,
    EIP1193RequestArg,
    EIP1193RequestResult,
    EIP1193EventName,
    EIP1193ProxiedEvents,
} from './services/eip1193ProviderProxy/'
export { EIP1193ProviderProxy } from './services/eip1193ProviderProxy/eip1193ProviderProxy'
export { logger } from './services/logger'
