import SafeEventEmitter from "@metamask/safe-event-emitter"
import type { EIP1193Provider, EIP1193RequestFn, EIP1474Methods } from "viem"

import { InjectedWalletHandler } from "./eip1193InjectedWalletHandler"
import { SocialWalletHandler } from "./eip1193SocialWalletHandler"
import type { EIP1193ConnectionHandler, HappyProviderConfig } from "./interface"

export class HappyProvider extends SafeEventEmitter implements EIP1193Provider {
    private injectedWalletHandler: EIP1193ConnectionHandler
    private socialWalletHandler: EIP1193ConnectionHandler

    constructor(config: HappyProviderConfig) {
        super()

        config.logger?.log("EIP1193Provider Created")

        // Injected Wallets
        this.injectedWalletHandler = new InjectedWalletHandler(config)
        this.registerConnectionHandlerEvents(this.injectedWalletHandler)

        // Iframe/Social Auth
        this.socialWalletHandler = new SocialWalletHandler(config)
        this.registerConnectionHandlerEvents(this.socialWalletHandler)
    }

    request: EIP1193RequestFn<EIP1474Methods> = async (args) => {
        type StrictArgsCast = Exclude<typeof args, { method: string; params: unknown }>

        if (this.injectedWalletHandler.isConnected()) {
            return await this.injectedWalletHandler.request(args as StrictArgsCast)
        }

        return await this.socialWalletHandler.request(args as StrictArgsCast)
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
