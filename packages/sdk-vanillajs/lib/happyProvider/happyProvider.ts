import { createUUID } from "@happychain/common"
import {
    AuthState,
    EIP1193UserRejectedRequestError,
    Msgs,
    SafeEventEmitter,
    WalletDisplayAction,
    WalletType,
    waitForCondition,
} from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderMsgsFromIframe } from "@happychain/sdk-shared"
import { InjectedWalletHandler } from "./injectedWalletHandler"
import type { EIP1193ConnectionHandler, HappyProviderConfig, HappyProviderPublic } from "./interface"
import { SocialWalletHandler } from "./socialWalletHandler"

export class HappyProvider extends SafeEventEmitter implements HappyProviderPublic {
    private readonly injectedWalletHandler: EIP1193ConnectionHandler
    private readonly socialWalletHandler: EIP1193ConnectionHandler

    private initialized = false

    private authState: AuthState = AuthState.Initializing
    private lastConnectedType: WalletType | undefined

    constructor(private config: HappyProviderConfig) {
        super()

        config.logger?.log("EIP1193Provider Created")

        config.msgBus.on(Msgs.UserChanged, (_user) => {
            this.lastConnectedType = _user?.type ?? this.lastConnectedType
        })

        config.msgBus.on(Msgs.IframeInit, (isInit) => {
            this.initialized = isInit
        })

        config.msgBus.on(Msgs.AuthStateChanged, (_authState) => {
            this.authState = _authState
            if (_authState === AuthState.Disconnected) {
                this.lastConnectedType = undefined
            }
        })

        config.providerBus.on(Msgs.ProviderEvent, this.handleProviderNativeEvent.bind(this))

        this.injectedWalletHandler = new InjectedWalletHandler(config)

        this.socialWalletHandler = new SocialWalletHandler(config)
    }

    /**
     * All events are received from iframe: social wallet events originate there;
     * injected wallet events are proxied through the iframe (which needs to learn of them),
     * then sent back.
     */
    private handleProviderNativeEvent(data: ProviderMsgsFromIframe[Msgs.ProviderEvent]) {
        this.emit(data.payload.event, data.payload.args)
    }

    private get activeHandler() {
        return this.lastConnectedType === WalletType.Injected && this.authState === AuthState.Connected
            ? this.injectedWalletHandler
            : this.socialWalletHandler
    }

    private isConnectionRequest(
        args: EIP1193RequestParameters,
    ): args is EIP1193RequestParameters<"eth_requestAccounts" | "wallet_requestPermissions"> {
        return (
            args.method === "eth_requestAccounts" ||
            (args.method === "wallet_requestPermissions" && args.params.some((p) => p.eth_accounts))
        )
    }

    public async request(args: EIP1193RequestParameters): Promise<EIP1193RequestResult> {
        // wait until either authenticated or unauthenticated
        await waitForCondition(() => this.initialized && this.authState !== AuthState.Initializing)

        try {
            return await this.activeHandler.request(args)
        } catch (e) {
            const isConnectionRequest = this.isConnectionRequest(args)

            if (e instanceof Error && e.name === "LoginRequired") {
                const resp = await this.requestLogin(args)

                // If it was already a 'connection' request, we can simply return the results here.
                if (isConnectionRequest) {
                    return resp
                }

                // If it was not a connection request, lets re-run now that we are logged in
                // and attempt again.
                return await this.request(args)
            }

            throw e
        }
    }

    private async requestLogin(args: EIP1193RequestParameters): Promise<ReturnType<typeof this.request>> {
        // Open Wallet
        this.config.msgBus?.emit(Msgs.RequestWalletDisplay, WalletDisplayAction.Open)

        const isConnectionRequest = this.isConnectionRequest(args)
        const req = {
            key: createUUID(),
            windowId: this.config.windowId,
            payload: isConnectionRequest ? args : ({ method: "eth_requestAccounts" } as const),
            error: null,
        }

        // Begin the login handshake
        void this.config.msgBus.emit(Msgs.ConnectRequest, req)
        return await new Promise((resolve, reject) => {
            const unsub = this.config.msgBus.on(Msgs.ConnectResponse, ({ request, response }) => {
                if (request.key !== req.key) {
                    // can occur when user connects with injected wallet
                    // the connection request itself will trigger a ConnectResponse
                    // but the onAccountsChange event will also trigger an ConnectResponse
                    // we can drop this, as its not the event we are waiting for
                    return
                }
                if (!response) return reject(new EIP1193UserRejectedRequestError())

                unsub()
                return resolve(response)
            })
        })
    }
}

/**
 * Mock implementation that ensures the SDK can be imported in SSR-first frameworks without errors
 */
export class HappyProviderSSRSafe extends SafeEventEmitter implements HappyProviderPublic {
    async request(): Promise<never> {
        throw new Error("Provider not available in server environment")
    }
}
