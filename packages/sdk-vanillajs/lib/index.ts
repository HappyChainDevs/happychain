import { HappyWallet } from "./happy-wallet"
import { uuid } from "./happyProvider/initialize"

export type WalletRegisterOptions = {
    rpcUrl?: string
    chainId?: string
}

/**
 * Registers the required components and initializes the SDK
 */
export function register(opts?: WalletRegisterOptions) {
    if (document.querySelector("happy-wallet")) {
        // don't register if already exists on page
        return
    }
    const wallet = new HappyWallet(uuid)

    if (opts?.rpcUrl) {
        wallet.setAttribute("rpc-url", opts.rpcUrl)
    }

    if (opts?.chainId) {
        wallet.setAttribute("chain-id", opts.chainId)
    }

    document.body.appendChild(wallet)
}

export type { HappyProvider } from "./happyProvider/happyProvider"

export { onModalUpdate, onUserUpdate, getCurrentUser, happyProvider } from "./happyProvider/initialize"

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
