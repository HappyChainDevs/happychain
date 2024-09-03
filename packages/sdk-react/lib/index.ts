export { HappyWalletProvider, useHappyChain } from "./components/HappyWalletProvider"

// re-export from happychain core
export { happyProvider, onModalUpdate, onUserUpdate, getCurrentUser, connect, disconnect } from "@happychain/js"

export type {
    // Happy Types
    HappyProvider,
    HappyUser,
    // RPC Errors
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
    EIP1193DisconnectedError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
    GenericProviderRpcError,
} from "@happychain/js"
