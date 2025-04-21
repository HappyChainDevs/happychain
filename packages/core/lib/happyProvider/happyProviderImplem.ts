import { type UUID, createUUID, happyProviderInfo, injectedProviderInfo } from "@happy.tech/common"
import {
    AuthState,
    type EIP1193RequestParameters,
    type EIP1193RequestResult,
    EIP1193UserRejectedRequestError,
    EventBus,
    EventBusMode,
    type HappyUser,
    type Logger,
    LoginRequiredError,
    Msgs,
    type MsgsFromApp,
    type MsgsFromIframe,
    type OverlayErrorCode,
    type ProviderMsgsFromApp,
    type ProviderMsgsFromIframe,
    SafeEventEmitter,
    WalletDisplayAction,
    WalletType,
    waitForCondition,
} from "@happy.tech/wallet-common"
import { announceProvider, createStore } from "mipd"
import type { EIP1193Provider } from "viem"
import { config } from "../config"
import { HappyProviderSSRSafe } from "./happyProviderSSRSafe"
import { InjectedWalletHandler } from "./injectedWalletHandler"
import type { EIP1193ConnectionHandler, HappyProviderInternal } from "./interface"
import {
    type AuthStateUpdateCallback,
    type DisplayOverlayErrorCallback,
    type ListenerUnsubscribeFn,
    type UserUpdateCallback,
    type WalletVisibilityCallback,
    registerListeners,
} from "./listeners"
import { SocialWalletHandler } from "./socialWalletHandler"

const mipdStore = createStore()

/** @internal */
export type HappyProviderConfig = Pick<typeof config, "iframePath"> & {
    logger?: Logger
    windowId: UUID
    providerBus: EventBus<ProviderMsgsFromIframe, ProviderMsgsFromApp>
    msgBus: EventBus<MsgsFromIframe, MsgsFromApp>
}

/**
 * Unique Window UUID.
 * Falls back to "server" in SSR environments.
 * @internal
 */
export const windowId = typeof window === "undefined" ? "server" : createUUID()

export class HappyProviderImplem extends SafeEventEmitter implements HappyProviderInternal {
    private readonly injectedWalletHandler: EIP1193ConnectionHandler
    private readonly socialWalletHandler: EIP1193ConnectionHandler

    private static INSTANCE: HappyProviderInternal

    public static instance(): HappyProviderInternal {
        if (!HappyProviderImplem.INSTANCE) {
            HappyProviderImplem.INSTANCE =
                typeof window === "undefined"
                    ? new HappyProviderSSRSafe()
                    : new HappyProviderImplem({
                          iframePath: config.iframePath,
                          windowId: windowId as UUID,
                          providerBus: new EventBus<ProviderMsgsFromIframe, ProviderMsgsFromApp>({
                              mode: EventBusMode.AppPort,
                              scope: "happy-chain-eip1193-provider",
                          }),
                          msgBus: new EventBus<MsgsFromIframe, MsgsFromApp>({
                              mode: EventBusMode.AppPort,
                              scope: "happy-chain-dapp-bus",
                          }),
                      })
        }

        return HappyProviderImplem.INSTANCE
    }

    private hooks: ReturnType<typeof registerListeners>

    private initialized = false
    private iframeReady = false

    private user: HappyUser | undefined

    private authState: AuthState = AuthState.Initializing
    private lastConnectedType: WalletType | undefined

    private iframeMsgBus: EventBus<MsgsFromIframe, MsgsFromApp>

    /**
     * Initializes the Happy Account wallet state and communication with the iframe.
     * Handles authentication, connection, and messaging between app and iframe contexts.
     * TODO
     */
    constructor(private config: HappyProviderConfig) {
        super()
        config.logger?.log("HappyProvider Created")

        this.iframeMsgBus = config.msgBus

        this.hooks = registerListeners(config.msgBus)

        this.hooks.onIframeInit((ready: boolean) => {
            this.iframeReady = ready

            if ("ethereum" in window) {
                // listen to message bus instead of window here because when embedded, in many situations, the
                // providers will not be detected. Duplicates are fine as we use the provider.id as the unique key
                void config.msgBus.emit(Msgs.AnnounceInjectedProvider, {
                    info: injectedProviderInfo,
                })
            }

            mipdStore.getProviders().forEach((detail) => {
                // don't forward ourselves to the iframe
                if (detail.info.rdns === "tech.happy") return

                void config.msgBus.emit(Msgs.AnnounceInjectedProvider, { info: detail.info })
            })
        })

        this.hooks.onUserUpdate((user?: HappyUser) => {
            this.user = user
            this.lastConnectedType = user?.type ?? this.lastConnectedType
        })

        this.hooks.onAuthStateUpdate((authState: AuthState) => {
            this.authState = authState
            if (authState === AuthState.Disconnected) {
                this.lastConnectedType = undefined
            }
        })

        config.providerBus.on(Msgs.ProviderEvent, this.handleProviderNativeEvent.bind(this))

        this.injectedWalletHandler = new InjectedWalletHandler(config)
        this.socialWalletHandler = new SocialWalletHandler(config)

        announceProvider({
            info: happyProviderInfo,
            provider: this as EIP1193Provider,
        })
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
        await waitForCondition(() => this.iframeReady && this.authState !== AuthState.Initializing)

        try {
            return await this.activeHandler.request(args)
        } catch (e) {
            const isConnectionRequest = this.isConnectionRequest(args)

            if (e instanceof LoginRequiredError) {
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

    getCurrentUser(): HappyUser | undefined {
        return this.user
    }

    displayWallet(open: boolean): void {
        void this.iframeMsgBus.emit(
            Msgs.RequestWalletDisplay,
            open ? WalletDisplayAction.Open : WalletDisplayAction.Closed,
        )
    }

    showSendScreen(): void {
        void this.iframeMsgBus.emit(Msgs.RequestWalletDisplay, WalletDisplayAction.Send)
    }

    displayError(code: OverlayErrorCode): void {
        void this.iframeMsgBus.emit(Msgs.SetOverlayError, code)
    }

    onUserUpdate(callback: UserUpdateCallback): ListenerUnsubscribeFn {
        return this.hooks.onUserUpdate(callback)
    }

    onWalletVisibilityUpdate(callback: WalletVisibilityCallback): ListenerUnsubscribeFn {
        return this.hooks.onWalletVisibilityUpdate(callback)
    }

    onAuthStateUpdate(callback: AuthStateUpdateCallback): ListenerUnsubscribeFn {
        return this.hooks.onAuthStateUpdate(callback)
    }

    onDisplayOverlayError(callback: DisplayOverlayErrorCallback): ListenerUnsubscribeFn {
        return this.hooks.onDisplayOverlayError(callback)
    }
}
