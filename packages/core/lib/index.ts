export { happyProvider } from "./happyProvider"
export type { HappyProvider } from "./happyProvider"

export { register } from "./register"
export type { WalletRegisterOptions } from "./register"

export {
    getCurrentUser,
    connect,
    disconnect,
    loadAbi,
    openWallet,
    requestSessionKey,
    showSendScreen,
    onUserUpdate,
} from "./functions.ts"

export { devnet, happyChainSepolia } from "@happy.tech/wallet-common"

export type {
    Chain,
    ChainBlockExplorer,
    ChainContract,
    ChainNativeCurrency,
    ChainRpcUrls,
} from "@happy.tech/wallet-common"

export type {
    UserUpdateCallback,
    WalletVisibilityCallback,
    ListenerUnsubscribeFn,
} from "./happyProvider/listeners"

export type {
    HappyUser,
    WalletType,
    GenericProviderRpcError,
    ProviderRpcErrorCode,
    EIP1193ErrorCodes,
    EIP1193ErrorObject,
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
    EIP1193DisconnectedError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
} from "@happy.tech/wallet-common"

export { createHappyPublicClient, createHappyWalletClient } from "./viem"
export type { HappyPublicClient, HappyWalletClient } from "./viem"

export { happyWagmiConnector, createHappyChainWagmiConfig } from "./wagmi"

export type { BadgeProps } from "./badge/define"
