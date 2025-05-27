import type { Resolvers, UUID } from "@happy.tech/common"
import { BasePopupProvider, Msgs, OverlayErrorCode } from "@happy.tech/wallet-common"
import type { EIP1193RequestParameters, ProviderMsgsFromWallet } from "@happy.tech/wallet-common"
import { getCurrentUser } from "../functions"
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
        return !!this.#wrapper.provider && !!getCurrentUser()
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

    protected override async requiresUserApproval(_args: EIP1193RequestParameters): Promise<boolean> {
        // We only require approval (= popup) on the initial connection request for injected wallets. This will
        // cause that request to flow to the approved handler, which is fine in this case. Everything else will flow
        // to the injected handler, and if approval is required, it will be solliciated from the injected wallet.
        return !(this.#wrapper.provider && getCurrentUser()) // !connected
    }

    protected override async requestExtraPermissions(_args: EIP1193RequestParameters): Promise<boolean> {
        // Approvals are handled by the injected wallet, no need to request any extra here.
        // If we needed approval (for the initial connection), we still do, so return true.
        return true
    }
}
