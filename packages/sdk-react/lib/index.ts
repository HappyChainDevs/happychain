/** Components */
export { HappyWalletProvider } from "./components/HappyWalletProvider"

/** Hooks */
export { useHappyChain } from "./hooks/useHappyChain"

// re-export happychain core
<<<<<<< HEAD
export {
    happyProvider,
    onModalUpdate,
    onUserUpdate,
} from "@happychain/js"
||||||| parent of f2638f7 (formatting & dead code elimination)
export {
    happyProvider,
    onModalUpdate,
    onUserUpdate,
} from '@happychain/js'
=======
export { happyProvider, onModalUpdate, onUserUpdate } from '@happychain/js'
>>>>>>> f2638f7 (formatting & dead code elimination)

export type {
    // RPC errors
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
    EIP1193DisconnectedError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
    GenericProviderRpcError,
    //
    HappyProvider,
    HappyUser,
} from "@happychain/js"
