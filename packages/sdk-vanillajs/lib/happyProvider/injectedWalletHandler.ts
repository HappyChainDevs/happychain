import type { UUID } from "@happychain/common"
import { BasePopupProvider, type EIP1193RequestParameters, Msgs } from "@happychain/sdk-shared"
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
    protected popupBaseUrl = ""
    private wrapper: InjectedWalletWrapper

    /** InjectedWalletHandler does not require popup */
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
        // checks will be handled by injected wallet if needed. We can safely bypass here
        // and rely on the users wallet to handle this.
        return false
    }

    protected override async requestExtraPermissions(_args: EIP1193RequestParameters): Promise<boolean> {
        // permissions are handled by the users injected wallet
        return true
    }
}
