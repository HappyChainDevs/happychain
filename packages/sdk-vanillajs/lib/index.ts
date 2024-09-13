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
    sendScreen,
} from "./happyProvider/initialize"

export type { UserUpdateCallback, ModalUpdateCallback, ListenerUnsubscribeFn } from "./happyProvider/listeners"

/**
 * Repository of supported chains.
 */
export * as chains from "./chains"

export type {
    HappyUser,
    GenericProviderRpcError,
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
    EIP1193DisconnectedError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
} from "@happychain/sdk-shared"
