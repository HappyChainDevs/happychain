import SafeEventEmitter from "@metamask/safe-event-emitter"

// === VALUES ======================================================================================

export * as chains from "./chains"
export { getChainFromSearchParams, convertToViemChain } from "./chains/utils"

export { AuthState, WalletType } from "./interfaces/happyUser"
export { isPermissionsRequest } from "./interfaces/eip1193"
export {
    GenericProviderRpcError,
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
    EIP1193DisconnectedError,
    EIP1193ErrorCodes,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
    getEIP1193ErrorObjectFromCode,
    getEIP1193ErrorObjectFromUnknown,
} from "./interfaces/errors"
export { Msgs, WalletDisplayAction } from "./interfaces/events"
export { permissionsLists, requiresApproval } from "./interfaces/permissions"

export { EventBus, EventBusMode } from "./services/eventBus"
export { logger } from "./services/logger"
export { requestPayloadIsHappyMethod } from "./utils/requestPayloadIsHappyMethod"
export { waitForCondition } from "./utils/waitForCondition"
export { shortenAddress } from "./utils/shortenAddress"
export { formatUserBalance } from "./utils/balanceFormatter"

// === TYPES =======================================================================================

export type { recordAbiPayload } from "./interfaces/eip1193"
export type { ChainParameters } from "./chains/utils"
export type { ConnectionProvider } from "./interfaces/connectionProvider"
export type { HappyUser } from "./interfaces/happyUser"
export type {
    EIP1193EventName,
    EIP1193RequestMethods,
    EIP1193RequestParameters,
    EIP1193RequestResult,
    RPCMethods,
    HappyMethods,
} from "./interfaces/eip1193"
export type { EIP6963ProviderInfo, EIP6963ProviderDetail, EIP6963AnnounceProviderEvent } from "./interfaces/eip6963"
export type { EIP1193ErrorObject, IProviderRpcError, ProviderRpcErrorCode } from "./interfaces/errors"
export type {
    MsgsFromApp,
    MsgsFromIframe,
    NoEvents,
    PopupMsgs,
    ProviderMsgsFromIframe,
    ProviderMsgsFromApp,
} from "./interfaces/events"
export type { ProviderEventPayload, ProviderEventError } from "./interfaces/payloads"

export type {
    EventBusOptions,
    EventHandler,
    EventKey,
} from "./services/eventBus"
export type { Logger } from "./services/logger"

export { BasePopupProvider } from "./classes/BasePopupProvider"

// Re-export class for use in other package(s)
export { SafeEventEmitter }
