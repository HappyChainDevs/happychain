export { register } from "./register"
export type { WalletRegisterOptions } from "./register"
export type { AddEthereumChainParameter } from "viem"

export type { HappyProviderPublic as HappyProvider } from "./happyProvider/interface"

export {
    devnet,
    happyChainSepolia,
    defaultChain,
    chains,
    chainsById,
} from "@happy.tech/wallet-common"

export type { Chain } from "@happy.tech/wallet-common"

export {
    onWalletVisibilityUpdate,
    onUserUpdate,
    getCurrentUser,
    happyProviderPublic as happyProvider,
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

export { happyWagmiConnector, createHappyChainWagmiConfig } from "./wagmi/happyWagmiConfig"

export type { BadgeProps } from "./badge/define"
