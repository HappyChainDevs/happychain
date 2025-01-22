import type { UUID } from "@happy.tech/common"
import { BasePopupProvider, type EIP1193RequestParameters, Msgs } from "@happy.tech/wallet-common"
import { InjectedWalletWrapper } from "./InjectedWalletWrapper"
import type { EIP1193ConnectionHandler, HappyProviderConfig } from "./interface"

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
    private wrapper: InjectedWalletWrapper

    /** InjectedWalletHandler does not require popups. */
    protected popupBaseUrl = ""

    constructor(protected config: HappyProviderConfig) {
        super(config.windowId)
        // local connection (injected wallet)
        this.wrapper = new InjectedWalletWrapper(config)

        config.providerBus.on(Msgs.RequestResponse, this.handleRequestResolution.bind(this))
    }

    isConnected(): boolean {
        return Boolean(this.wrapper.provider)
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
        // Checks will be handled by the injected wallet if needed.
        return false
    }

    protected override async requestExtraPermissions(_args: EIP1193RequestParameters): Promise<boolean> {
        // Approvals are handled by the injected wallet, no need to request any extra here.
        return true
    }
}
