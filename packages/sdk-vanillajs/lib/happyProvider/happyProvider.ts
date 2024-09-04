import { AuthState, waitForCondition } from "@happychain/sdk-shared"
import type { EIP1193RequestMethods, EIP1193RequestParameters, EIP1193RequestResult } from "@happychain/sdk-shared"
import SafeEventEmitter from "@metamask/safe-event-emitter"
import type { EIP1193Provider } from "viem"
import { InjectedWalletHandler } from "./injectedWalletHandler"
import type { EIP1193ConnectionHandler, HappyProviderConfig } from "./interface"
import { SocialWalletHandler } from "./socialWalletHandler"

/**
 * HappyProvider is a EIP1193 Ethereum Provider {@link https://eips.ethereum.org/EIPS/eip-1193}
 *
 * @example
 * ### Setting up viem client
 * ```ts twoslash
 * import { createPublicClient, custom } from 'viem'
 * import { happyProvider } from '@happychain/js'
 * // ---cut---
 * const publicClient = createPublicClient({
 *   transport: custom(happyProvider)
 * })
 * ```
 */
export class HappyProvider extends SafeEventEmitter {
    private injectedWalletHandler: EIP1193ConnectionHandler
    private socialWalletHandler: EIP1193ConnectionHandler

    private authState: AuthState = AuthState.Connecting

    constructor(config: HappyProviderConfig) {
        super()

        config.logger?.log("EIP1193Provider Created")

        config.dappBus.on("auth-state", (_authState) => {
            this.authState = _authState
        })

        // Injected Wallets
        this.injectedWalletHandler = new InjectedWalletHandler(config)
        this.registerConnectionHandlerEvents(this.injectedWalletHandler)

        // Iframe/Social Auth
        this.socialWalletHandler = new SocialWalletHandler(config)
        this.registerConnectionHandlerEvents(this.socialWalletHandler)
    }

    public async request<TString extends EIP1193RequestMethods = EIP1193RequestMethods>(
        args: EIP1193RequestParameters<TString>,
    ): Promise<EIP1193RequestResult<TString>> {
        if (this.authState === AuthState.Connecting) {
            // wait till either authenticated or unauthenticated
            await waitForCondition(() => this.authState !== AuthState.Connecting)
        }

        if (this.injectedWalletHandler.isConnected()) {
            return await this.injectedWalletHandler.request(args)
        }

        return await this.socialWalletHandler.request(args)
    }

    /** Simply forward all provider events transparently */
    private registerConnectionHandlerEvents(handler: EIP1193ConnectionHandler) {
        handler.on("accountsChanged", (accounts) => this.emit("accountsChanged", accounts))
        handler.on("chainChanged", (chainId) => this.emit("chainChanged", chainId))
        handler.on("connect", (connectInfo) => this.emit("connect", connectInfo))
        handler.on("disconnect", (error) => this.emit("disconnect", error))
        handler.on("message", (message) => this.emit("message", message))
    }
}
