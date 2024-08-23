/** React Components */
export { HappyWalletProvider } from "./components/HappyWalletProvider"

/** React Hooks */
export { useHappyChain } from "./hooks/useHappyChain"

// re-export from happychain core
export { happyProvider, onModalUpdate, onUserUpdate, getCurrentUser } from "@happychain/js"

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
