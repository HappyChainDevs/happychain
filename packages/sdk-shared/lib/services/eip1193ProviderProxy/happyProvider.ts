import SafeEventEmitter from "@metamask/safe-event-emitter"
import type { EIP1193Provider, EIP1193RequestFn, EIP1474Methods } from "viem"

import { LocalConnectionHandler } from "./eip1193LocalConnection"
import { RemoteConnectionHandler } from "./eip1193RemoteConnection"
import type { EIP1193ConnectionHandler, HappyProviderConfig } from "./interface"

export class HappyProvider extends SafeEventEmitter implements EIP1193Provider {
    private connections: EIP1193ConnectionHandler[]

    constructor(config: HappyProviderConfig) {
        super()

        config.logger?.log("EIP1193Provider Created")

        // Injected Wallets
        const localConnection = new LocalConnectionHandler(config)
        this.registerConnectionHandlerEvents(localConnection)

        // Iframe/Social Auth
        const remoteConnection = new RemoteConnectionHandler(config)
        this.registerConnectionHandlerEvents(remoteConnection)

        // initialized in order of priority to check on requests
        this.connections = [localConnection, remoteConnection]
    }

    request: EIP1193RequestFn<EIP1474Methods> = async (args) => {
        type StrictArgsCast = Exclude<typeof args, { method: string; params: unknown }>

        for (const connection of this.connections) {
            if (connection.isConnected()) {
                return await connection.request(args as StrictArgsCast)
            }
        }

        throw new Error("No Connected Providers")
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
