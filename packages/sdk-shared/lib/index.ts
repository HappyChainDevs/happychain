// === VALUES ======================================================================================

export { config } from "./config"

export * as chains from "./chains"
export { getChainFromSearchParams, defaultChain, convertToViemChain } from "./chains/utils"

export { AuthState } from "./interfaces/happyUser"
export { isPermissionsRequest } from "./interfaces/eip1193"
export {
    GenericProviderRpcError,
    EIP1193UserRejectedRequestError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193DisconnectedError,
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
    getEIP1193ErrorObjectFromUnknown,
} from "./interfaces/errors"
export { Msgs } from "./interfaces/events"
export { permissionsLists, requiresApproval } from "./interfaces/permissions"

export { EventBus, EventBusMode } from "./services/eventBus"
export { logger } from "./services/logger"

export { createUUID } from "./utils/uuid"
export { waitForCondition } from "./utils/waitForCondition"

// === TYPES =======================================================================================

export type { ChainParameters } from "./chains/utils"
export type { ConnectionProvider } from "./interfaces/connectionProvider"
export type { HappyUser } from "./interfaces/happyUser"
export type {
    EIP1193RequestMethods,
    EIP1193RequestParameters,
    EIP1193RequestResult,
    EIP1193EventName,
} from "./interfaces/eip1193"
export type { EIP6963ProviderInfo, EIP6963ProviderDetail, EIP6963AnnounceProviderEvent } from "./interfaces/eip6963"
export type { EIP1193ErrorObject, IProviderRpcError } from "./interfaces/errors"
export type {
    MsgsFromIframe,
    MsgsFromApp,
    ProviderMsgsFromApp,
    PopupMsgsFromIframe,
    PopupMsgs,
    NoEvents,
} from "./interfaces/events"
export type { ProviderEventPayload, ProviderEventError } from "./interfaces/payloads"

export type {
    EventKey,
    EventHandler,
    EventBusOptions,
} from "./services/eventBus"
export type { Logger } from "./services/logger"

export type { UUID } from "./utils/uuid"
