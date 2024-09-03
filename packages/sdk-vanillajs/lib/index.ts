export { register } from "./register"
export type { WalletRegisterOptions } from "./register"

export type { HappyProvider } from "./happyProvider/happyProvider"

export {
    onModalUpdate,
    onUserUpdate,
    getCurrentUser,
    happyProvider,
    connect,
    disconnect,
} from "./happyProvider/initialize"

export type { UserUpdateCallback, ModalUpdateCallback, ListenerUnsubscribeFn } from "./happyProvider/listeners"

export * as chains from "./chains"

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
