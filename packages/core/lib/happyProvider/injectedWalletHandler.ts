import { createUUID, promiseWithResolvers } from "@happy.tech/common"
import type { Resolvers, UUID } from "@happy.tech/common"
import { BasePopupProvider, Msgs, OverlayErrorCode } from "@happy.tech/wallet-common"
import type { EIP1193RequestParameters, ProviderMsgsFromWallet } from "@happy.tech/wallet-common"
import { InjectedWalletWrapper } from "./InjectedWalletWrapper"
import { type HappyProviderConfig, HappyProviderImplem } from "./happyProviderImplem"
import type { EIP1193ConnectionHandler } from "./interface"

/**
 * `InjectedWalletHandler` listens to connection requests from the iframe.
 * When a connection request occurs, it searches EIP6963 compatible
 * wallets and attempts to find the requested wallet. Assuming its successful
 * it fills out HappyUser details and returns this to the iframe to be displayed.
 * If unsuccessful (user rejects, wallet can't be found) the dapp disconnects
 * and sets user and provider to undefined.
 *
 * If connected, it simply proxies all requests directly into the appropriate
 * provider for the connected wallet
 */
export class InjectedWalletHandler extends BasePopupProvider implements EIP1193ConnectionHandler {
    /**
     * InjectedWalletHandler does not require popups.
     * It extends BasePopupProvider to inherit the common
     * eip-1193 request tracking and permissions logic.
     */
    protected readonly popupBaseUrl: string
    #inFlightPermissionChecks = new Map<string, Resolvers<boolean>>()
    #wrapper: InjectedWalletWrapper

    constructor(protected config: HappyProviderConfig) {
        super(config.windowId)
        this.popupBaseUrl = config.iframePath

        // local connection (injected wallet)
        this.#wrapper = new InjectedWalletWrapper(config)

        config.providerBus.on(Msgs.RequestResponse, this.handleRequestResolution.bind(this))
        config.providerBus.on(Msgs.PermissionCheckResponse, this.handlePermissionCheck.bind(this))
    }

    private async handlePermissionCheck(data: ProviderMsgsFromWallet[Msgs.PermissionCheckResponse]) {
        const inFlight = this.#inFlightPermissionChecks.get(data.key)
        if (!inFlight) return
        if (typeof data.payload === "boolean") {
            inFlight.resolve(data.payload)
        } else {
            inFlight.reject(data.error)
        }
        this.#inFlightPermissionChecks.delete(data.key)
    }

    public isConnected(): boolean {
        return Boolean(this.#wrapper.provider)
    }

    protected onPopupBlocked() {
        HappyProviderImplem.instance().displayError(OverlayErrorCode.PopupBlocked)
    }

    protected handlePermissionless(key: UUID, args: EIP1193RequestParameters): undefined {
        // Note that this always works regardless of log in or connection status.
        void this.config.providerBus.emit(Msgs.RequestInjected, {
            key,
            windowId: this.config.windowId,
            error: null,
            payload: args,
        })
    }

    protected override requiresUserApproval(args: EIP1193RequestParameters): Promise<boolean> {
        const key = createUUID()
        const { promise, resolve, reject } = promiseWithResolvers<boolean>()
        this.#inFlightPermissionChecks.set(key, { resolve, reject })
        void this.config.providerBus.emit(Msgs.PermissionCheckRequest, {
            key,
            windowId: this.config.windowId,
            payload: args,
            error: null,
        })

        return promise
    }

    protected override async requestExtraPermissions(args: EIP1193RequestParameters): Promise<boolean> {
        // Note: approvals confirmed by the user in the popup will be directed to the approved handler,
        // _not_ the injected handler as you may expect. This is acceptable for eth_requestAccounts &
        // wallet_requestPermissions as they simply grant permissions.
        const isConnectionRequest =
            args.method === "eth_requestAccounts" ||
            (args.method === "wallet_requestPermissions" && args.params.some((p) => p.eth_accounts))

        return isConnectionRequest
    }
}
