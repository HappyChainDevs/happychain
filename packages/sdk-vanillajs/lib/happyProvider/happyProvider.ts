import { type HTTPString, type UUID, createUUID } from "@happychain/common"
import { AuthState, EIP1193UserRejectedRequestError, ModalStates, Msgs, waitForCondition } from "@happychain/sdk-shared"
import type { EIP1193RequestMethods, EIP1193RequestParameters, EIP1193RequestResult } from "@happychain/sdk-shared"
import SafeEventEmitter from "@metamask/safe-event-emitter"
import { InjectedWalletHandler } from "./injectedWalletHandler"
import type { EIP1193ConnectionHandler, HappyProviderConfig, HappyProviderPublic } from "./interface"
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
let counter = 0
export class HappyProvider extends SafeEventEmitter implements HappyProviderPublic {
    private readonly injectedWalletHandler: EIP1193ConnectionHandler
    private readonly socialWalletHandler: EIP1193ConnectionHandler

    private authState: AuthState = AuthState.Connecting

    constructor(private config: HappyProviderConfig) {
        super()

        config.logger?.log("EIP1193Provider Created")

        config.msgBus.on(Msgs.AuthStateChanged, (_authState) => {
            this.authState = _authState
        })

        config.msgBus.on(Msgs.OriginRequest, () =>
            config.msgBus.emit(Msgs.OriginResponse, location.origin as HTTPString),
        )

        this.injectedWalletHandler = new InjectedWalletHandler(config)
        this.registerConnectionHandlerEvents(this.injectedWalletHandler)

        this.socialWalletHandler = new SocialWalletHandler(config)
        this.registerConnectionHandlerEvents(this.socialWalletHandler)

        config.msgBus.on(Msgs.InjectedWalletRequestConnect, this.handleInjectedProviderConnectionRequest.bind(this))
    }

    public async request<TString extends EIP1193RequestMethods = EIP1193RequestMethods>(
        args: EIP1193RequestParameters<TString>,
    ): Promise<EIP1193RequestResult<TString>> {
        console.log({ inHappy: true, args })
        const reqId = `happy-reqId-${counter++}`
        console.log(reqId, args)
        try {
            if (this.authState === AuthState.Connecting) {
                // wait till either authenticated or unauthenticated
                await waitForCondition(() => this.authState !== AuthState.Connecting)
            }

            console.log({ inj: this.injectedWalletHandler.isConnected() })

            const handler = this.injectedWalletHandler.isConnected()
                ? this.injectedWalletHandler
                : this.socialWalletHandler

            return await handler.request(args)
        } catch (e) {
            // if
            if (e && typeof e === "object" && "name" in e && e?.name === "RequiresLogin") {
                /**
                 * this opens the login modal, and prompts the user to connect
                 *
                 * after connection, if the original request was not a login request
                 * we will execute and return the result.
                 *
                 * if it was a login request (eth_requestAccounts, wallet_requestPermissions)
                 * we can just return the result directly
                 */
                if (["eth_requestAccount", "wallet_requestPermissions"].includes(args.method)) {
                    return await this.handleLogin(args)
                }

                // /**
                //  * retry the original request not that we are connected.
                //  *
                //  * Note: if debugging be aware that some libraries such as
                //  * ethers will cancel the original request and replace ti with
                //  * a login request. so if you call personal_sign with ethers.js
                //  * while not connected, it will first call eth_accounts, then
                //  * eth_requestAccounts. This can be a source of confusion
                //  */
                await this.handleLogin({ method: "eth_requestAccounts" })
                return await this.request(args)
            }
            if (e && typeof e === "object" && "name" in e && e?.name === "RequiresPermissions") {
                await this.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })
                return await this.request(args)
            }
            console.log(reqId, "REQ failed in happyProvider", args)
            throw e
        }
    }

    /** Simply forward all provider events transparently */
    private registerConnectionHandlerEvents(handler: EIP1193ConnectionHandler) {
        handler.on("accountsChanged", (accounts) => this.emit("accountsChanged", accounts))
        handler.on("chainChanged", (chainId) => this.emit("chainChanged", chainId))
        handler.on("connect", (connectInfo) => this.emit("connect", connectInfo))
        handler.on("disconnect", (error) => this.emit("disconnect", error))
        handler.on("message", (message) => this.emit("message", message))
    }

    private async handleInjectedProviderConnectionRequest({ rdns }: { rdns?: string }) {
        /**
         * When an injected wallet requests to be connected here, we will find the original promise, and resolve it
         * to conclude the connection handshake
         */
        await (this.injectedWalletHandler as InjectedWalletHandler).handleProviderConnectionRequest({ rdns })
    }

    private handleLogin(_args: { method: string }) {
        this.config.msgBus.emit(Msgs.RequestDisplay, ModalStates.Login)
        return new Promise((resolve, reject) => {
            /**
             * Unsubscribe from changes when the login modal closes.
             *
             * if the request was closed manually, a User Rejected error
             * is thrown. otherwise, we can assume it was closed as part
             * of the authentication process and the userChanged event
             * will handle the promise resolution
             */
            const unsubscribeClose = this.config.msgBus.on(Msgs.ModalToggle, (state) => {
                if (state.isOpen) return
                unsubscribeClose()
                if (state.cancelled) {
                    unsubscribeSuccess()
                    reject(new EIP1193UserRejectedRequestError())
                }
            })

            const unsubscribeSuccess = this.config.msgBus.on(Msgs.UserChanged, (user) => {
                if (user) {
                    // TODO: this only works for eth_requestAccounts, not wallet_requestPermissions
                    resolve(user.addresses)
                }
            })
        })
    }
}
