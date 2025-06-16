import SafeEventEmitter from "@metamask/safe-event-emitter"
// Re-export class for use in other package(s)
export { SafeEventEmitter }

// === VALUES ======================================================================================

export * from "./chains/viem"
export { chainDefinitions } from "./chains/definitions"

export { convertToViemChain } from "./chains/utils"
export { AuthState, WalletType } from "./interfaces/happyUser"

export * from "./errors"

export { permissionsLists, requiresApproval } from "./interfaces/permissions"

// services
export { EventBus, EventBusMode } from "./services/eventBus"

// === TYPES =======================================================================================

export type { Chain, ChainBlockExplorer, ChainContract, ChainRpcUrls, ChainNativeCurrency } from "./chains/viem"
export { Msgs, WalletDisplayAction } from "./interfaces/events"
export type { RecordAbiPayload } from "./interfaces/eip1193"
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
export { HappyMethodNames } from "./interfaces/eip1193"
export type { EIP6963ProviderInfo, EIP6963ProviderDetail, EIP6963AnnounceProviderEvent } from "./interfaces/eip6963"

export type {
    MsgsFromApp,
    MsgsFromWallet,
    PopupMsgs,
    ProviderMsgsFromWallet,
    ProviderMsgsFromApp,
    ApprovedRequestPayload,
    RequestExtraData,
} from "./interfaces/events"
export type { ProviderEventPayload, ProviderEventError } from "./interfaces/payloads"

export type {
    EventBusOptions,
    EventHandler,
    EventKey,
} from "./services/eventBus"

export { BasePopupProvider } from "./classes/BasePopupProvider"
