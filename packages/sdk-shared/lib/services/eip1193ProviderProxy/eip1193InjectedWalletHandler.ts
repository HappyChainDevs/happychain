import SafeEventEmitter from "@metamask/safe-event-emitter"
import { createStore } from "mipd"
import type { EIP1193RequestFn, EIP1474Methods } from "viem"

import type { HappyUser } from "../../interfaces/happyUser"

import type { EIP1193ConnectionHandler, HappyProviderConfig } from "./interface"

const store = createStore()

/**
 * InjectedWalletHandler listens to connection requests from the iframe.
 * When a connection request occurs, it searches EIP6963 compatible
 * wallets and attempts to find the requested wallet. Assuming its successful
 * it fills out HappyUser details and returns this to the iframe to be displayed.
 * If unsuccessful (user rejects, wallet can't be found) the dapp disconnects
 * and sets user and provider to undefined.
 *
 * If connected, it simply proxies all requests directly into the appropriate
 * provider for the connected wallet
 */
export class InjectedWalletHandler extends SafeEventEmitter implements EIP1193ConnectionHandler {
    private localConnection: ReturnType<typeof store.findProvider>

    constructor(private config: HappyProviderConfig) {
        super()
        // local connection (injected wallet)
        config.dappBus.on("injected-wallet:request", this.handleProviderConnectionRequest.bind(this))
    }

    isConnected(): boolean {
        return Boolean(this.localConnection)
    }

    request: EIP1193RequestFn<EIP1474Methods> = async (args) => {
        if (!this.localConnection) {
            throw new Error("Can not make request through local connection")
        }
        return await this.localConnection.provider.request(
            args as Exclude<typeof args, { method: string; params: unknown }>,
        )
    }

    /** Injected Wallet Handlers */
    private async handleProviderDisconnectionRequest() {
        this.config.dappBus.emit("injected-wallet:response", { user: undefined })
        this.localConnection = undefined
    }

    private async handleProviderConnectionRequest(rdns?: string) {
        if (!rdns) {
            return this.handleProviderDisconnectionRequest()
        }
        try {
            const providerDetails = store.findProvider({ rdns })
            if (!providerDetails) {
                throw new Error("Failed to find provider")
            }

            providerDetails.provider.on("accountsChanged", (accounts) => {
                this.emit("accountsChanged", accounts)
                if (!accounts.length) {
                    this.handleProviderDisconnectionRequest()
                    return
                }
                const [address] = accounts
                const user = this.createHappyUserFromAddress(rdns, address)
                this.config.dappBus.emit("injected-wallet:response", { user })
            })
            providerDetails.provider.on("chainChanged", (chainId) => this.emit("chainChanged", chainId))
            providerDetails.provider.on("connect", (connectInfo) => this.emit("connect", connectInfo))
            providerDetails.provider.on("disconnect", (error) => this.emit("disconnect", error))
            providerDetails.provider.on("message", (message) => this.emit("message", message))

            const [address] = await providerDetails.provider.request({ method: "eth_requestAccounts" })

            this.localConnection = providerDetails

            const user = this.createHappyUserFromAddress(rdns, address)
            this.config.dappBus.emit("injected-wallet:response", { user })
        } catch {
            this.handleProviderDisconnectionRequest()
        }
    }

    private createHappyUserFromAddress(rdns: string, address: `0x${string}`): HappyUser {
        return {
            // connection type
            type: "injected",
            provider: rdns,
            // social details
            uid: address,
            email: "",
            name: `${address.slice(0, 6)}...${address.slice(-4)}`,
            ens: "",
            avatar: `https://avatar.vercel.sh/${address}?size=400`,
            // web3 details
            address: address,
            addresses: [address],
        }
    }
}
