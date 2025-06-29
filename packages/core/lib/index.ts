export { happyProvider } from "./happyProvider"
export type { HappyProvider } from "./happyProvider"

export { loadHappyWallet } from "./loadHappyWallet"
export type { LoadHappyWalletOptions } from "./loadHappyWallet"

export {
    getCurrentUser,
    connect,
    disconnect,
    loadAbi,
    openWallet,
    requestSessionKey,
    revokeSessionKey,
    showSendScreen,
    onUserUpdate,
} from "./functions"

export { anvil, happyChainSepolia } from "@happy.tech/wallet-common"

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
    ProviderRpcError,
    EIP1193ErrorCodes,
    EIP1193ChainDisconnectedError,
    EIP1193DisconnectedError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
    EIP1474ErrorCodes,
    HappyRpcError,
    EthereumRpcError,
} from "@happy.tech/wallet-common"

export { createHappyPublicClient, createHappyWalletClient } from "./viem"
export type { HappyPublicClient, HappyWalletClient } from "./viem"

export { happyWagmiConnector, createHappyChainWagmiConfig } from "./wagmi"

export { getChain } from "./utils/getChain"
