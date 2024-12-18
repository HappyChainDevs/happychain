export { register } from "./register"
export type { WalletRegisterOptions } from "./register"
export type { AddEthereumChainParameter } from "viem"

export type { HappyProviderPublic as HappyProvider } from "./happyProvider/interface"

export {
    onWalletVisibilityUpdate,
    onUserUpdate,
    getCurrentUser,
    happyProviderPublic as happyProvider,
    connect,
    disconnect,
    showSendScreen,
    preloadAbi,
} from "./happyProvider/initialize"

export type {
    UserUpdateCallback,
    WalletVisibilityCallback,
    ListenerUnsubscribeFn,
} from "./happyProvider/listeners"

/**
 * Repository of supported chains.
 * re-export as const instead of namespaced module
 */
import * as _chains from "./chains"
export const chains = { ..._chains }

export type {
    HappyUser,
    WalletType,
    GenericProviderRpcError,
    ProviderRpcErrorCode,
    EIP1193ErrorObject,
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
    EIP1193DisconnectedError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
} from "@happychain/sdk-shared"

export type { ProviderRpcErrorCode as ViemProviderRpcErrorCode } from "viem"
