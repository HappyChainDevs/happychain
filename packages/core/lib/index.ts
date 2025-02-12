export { register } from "./register"
export type { WalletRegisterOptions } from "./register"

export type { HappyProvider } from "./happyProvider/interface"

export {
    devnet,
    happyChainSepolia,
    defaultChain,
    chains,
    chainsById,
} from "@happy.tech/wallet-common"

export type {
    Chain,
    ChainBlockExplorer,
    ChainContract,
    ChainNativeCurrency,
    ChainRpcUrls,
} from "@happy.tech/wallet-common"

export {
    onWalletVisibilityUpdate,
    onUserUpdate,
    getCurrentUser,
    happyProvider,
    connect,
    disconnect,
    showSendScreen,
    openWallet,
    loadAbi,
    requestSessionKey,
} from "./happyProvider/initialize"

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

export type { BadgeProps } from "./badge/define"
