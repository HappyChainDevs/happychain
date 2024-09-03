export { register } from "./register"
export type { WalletRegisterOptions, DefaultChains } from "./register"

export type { HappyProvider } from "./happyProvider/happyProvider"

import { happyProvider } from "./happyProvider/initialize"
export { onModalUpdate, onUserUpdate, getCurrentUser, happyProvider } from "./happyProvider/initialize"
export type { HappyProviderConfig } from "./happyProvider/interface"
export type { UserUpdateCallback, ModalUpdateCallback, ListenerUnsubscribeFn } from "./happyProvider/listeners"

export type {
    // Errors
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
    EIP1193DisconnectedError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
    GenericProviderRpcError,
    // User
    HappyUser,
} from "@happychain/sdk-shared"

export async function connect() {
    return await happyProvider.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
    })
}

export async function disconnect() {
    return await happyProvider.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
    })
}
