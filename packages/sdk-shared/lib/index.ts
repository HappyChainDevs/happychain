export { isPermissionsRequest } from "./interfaces/events"
export { createUUID } from "./utils/uuid"
export * as chains from "./chains"
export { AuthState, WalletType } from "./interfaces/happyUser"
export { EventBus, EventBusMode } from "./services/eventBus"
export { config } from "./config"
export { getChainFromSearchParams, defaultChain, convertToViemChain } from "./chains/utils"
export { logger } from "./services/logger"
export { permissionsLists, requiresApproval } from "./services/permissions"
export { waitForCondition } from "./utils/waitForCondition"
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
export type { ChainParameters } from "./chains/utils"
export type { UUID } from "./utils/uuid"
export type { HappyEvents } from "./interfaces/events"
export type { HappyUser } from "./interfaces/happyUser"
export type { Logger } from "./services/logger"
export type {
    ProviderBusEventsFromApp,
    ProviderBusEventsFromIframe,
    PopupBusEvents,
    NoEvents,
} from "./services/eip1193Provider/events"
export type { EIP1193ErrorObject, IProviderRpcError } from "./services/eip1193Provider/errors"
export type {
    EventKey,
    EventHandler,
    EventSchema,
    EventBusOptions,
} from "./services/eventBus"
export type {
    EIP6963ProviderInfo,
    EIP6963ProviderDetail,
    EIP6963AnnounceProviderEvent,
    ConnectionProvider,
    EIP1193RequestMethods,
    EIP1193RequestParameters,
    EIP1193RequestResult,
    EIP1193EventName,
} from "./interfaces/eip1193Provider"

/**
 * Here we re-export some viem types, so consuming packages always get the same type from the same source
 * i.e. happychain/js will use some of these and pull from viem
 * but the happychain/react will use some of these also, and get some internal types from happychain/js and some from viem
 * resulting in a compiled result such as
 *
 * import { AddEthereumChainParameter } from 'viem'
 * import { AddEthereumChainParameter_2 } from 'viem'
 *
 * with both types being incompatible with each other
 */
import type {
    RpcSchema,
    AddEthereumChainParameter as ViemAddEthereumChainParameter,
    EIP1193Provider as ViemEIP1193Provider,
    EIP1193RequestFn as ViemEIP1193RequestFn,
    EIP1474Methods as ViemEIP1474Methods,
} from "viem"
export type AddEthereumChainParameter = ViemAddEthereumChainParameter
export type EIP1193Provider = ViemEIP1193Provider
export type EIP1193RequestFn<rpcSchema extends RpcSchema | undefined = undefined> = ViemEIP1193RequestFn<rpcSchema>
export type EIP1474Methods = ViemEIP1474Methods
