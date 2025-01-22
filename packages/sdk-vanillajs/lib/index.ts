export { register } from "./register"
export type { WalletRegisterOptions } from "./register"
export type { AddEthereumChainParameter } from "viem"

export type { HappyProviderPublic as HappyProvider } from "./happyProvider/interface"

import {
    chains as _chains,
    chainsById as _chainsById,
    defaultChain as _defaultChain,
    devnet as _devnet,
    happyChainSepolia as _happyChainSepolia,
} from "@happychain/sdk-shared"
import type { Chain } from "viem"

export const chains: Chain[] = _chains
export const chainsById: Map<number, Chain> = _chainsById
export const defaultChain: Chain = _defaultChain
export const devnet: Chain = _devnet
export const happyChainSepolia: Chain = _happyChainSepolia

export {
    onWalletVisibilityUpdate,
    onUserUpdate,
    getCurrentUser,
    happyProviderPublic as happyProvider,
    connect,
    disconnect,
    showSendScreen,
    loadAbi,
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
} from "@happychain/sdk-shared"

export type { ProviderRpcErrorCode as ViemProviderRpcErrorCode } from "viem"

export { happyWagmiConnector, createHappyChainWagmiConfig } from "./wagmi/happyWagmiConfig"
