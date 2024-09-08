export { HappyWalletProvider, useHappyChain } from "./components/HappyWalletProvider"

export { happyProvider, onModalUpdate, onUserUpdate, getCurrentUser, chains, connect, disconnect } from "@happychain/js"

export type {
    HappyProvider,
    HappyUser,
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
    EIP1193DisconnectedError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
    GenericProviderRpcError,
} from "@happychain/js"
