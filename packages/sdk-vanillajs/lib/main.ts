import { HappyWallet } from './happy-wallet'

export { HappyWallet }

export function register() {
    if (document.querySelector('happy-wallet')) {
        // don't register if already exists on page
        return
    }
    document.body.appendChild(new HappyWallet())
}

// re-export happychain core
export {
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
    EIP1193DisconnectedError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
    EventBus,
    EventBusChannel,
    GenericProviderRpcError,
    HappyProvider,
    config,
    happyProvider,
    logger,
    onModalUpdate,
    onUserUpdate,
} from '@happychain/sdk-shared'

export type {
    ConnectionProvider,
    EIP1193ErrorObject,
    EIP1193EventName,
    EIP1193ProxiedEvents,
    EIP1193RequestArg,
    EIP1193RequestResult,
    EIP6963AnnounceProviderEvent,
    EIP6963ProviderDetail,
    EIP6963ProviderInfo,
    EventBusOptions,
    EventHandler,
    EventKey,
    EventMap,
    EventPayload,
    EventSchema,
    EventUUID,
    HappyEvents,
    HappyUser,
    IEventBus,
    IProviderRpcError,
    Logger,
} from '@happychain/sdk-shared'
