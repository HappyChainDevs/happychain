import { uuid } from './happyProvider/initialize'

import { HappyWallet } from './happy-wallet'

export type WalletRegisterOptions = {
    rpcUrl?: string
    chainId?: string
}
/**
 * Register the initialized wallet
 */
export function register(opts?: WalletRegisterOptions) {
    if (document.querySelector('happy-wallet')) {
        // don't register if already exists on page
        return
    }
    const wallet = new HappyWallet(uuid)

    if (opts?.rpcUrl) {
        wallet.setAttribute('rpc-url', opts.rpcUrl)
    }

    if (opts?.chainId) {
        wallet.setAttribute('chain-id', opts.chainId)
    }

    document.body.appendChild(wallet)
}

export type { HappyProvider } from './happyProvider/happyProvider'

export {
    onModalUpdate,
    onUserUpdate,
    happyProvider,
} from './happyProvider/initialize'

// re-export happychain core
export { config } from '@happychain/sdk-shared'

export type {
    // Errors
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
    EIP1193DisconnectedError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
    GenericProviderRpcError,
    //
    // ConnectionProvider,
    // EIP1193ErrorObject,
    // EIP1193EventName,
    // EIP1193ProxiedEvents,
    // EIP1193RequestArg,
    // EIP1193RequestResult,
    // EIP6963AnnounceProviderEvent,
    // EIP6963ProviderDetail,
    // EIP6963ProviderInfo,
    // EventBusOptions,
    // EventHandler,
    // EventKey,
    // EventMap,
    // EventPayload,
    // EventSchema,
    // EventUUID,
    HappyEvents,
    HappyUser,
    // IEventBus,
    // IProviderRpcError,
    // Logger,
} from '@happychain/sdk-shared'
