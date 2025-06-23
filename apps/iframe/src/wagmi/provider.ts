import type { UUID } from "@happy.tech/common"
import type { EIP1193RequestParameters } from "@happy.tech/wallet-common"
import {
    AuthState,
    BasePopupProvider,
    EIP1193UserRejectedRequestError,
    WalletType,
    waitForCondition,
} from "@happy.tech/wallet-common"
import type { EIP1193Provider } from "viem"
import { addBanner } from "#src/state/banner"
import { getCurrentChain } from "#src/state/chains"
import { getUser } from "#src/state/user"
import { handleInjectedRequest, handlePermissionlessRequest } from "../requests"
import { getAuthState } from "#src/state/authState"
import { getWalletURL, walletID } from "#src/utils/appURL"
import { checkIfRequestRequiresConfirmation } from "#src/requests/checkIfRequestRequiresConfirmation"

/**
 * EIP-1193 provider for transactions initiated from the wallet.
 * Used by wagmi to handle all transactions when in standalone mode,
 * as well as internal transactions such as sending via the Send screen
 * wether or not in stand alone mode.
 * Also used by `InjectedProviderProxy` when a user is connected via an injected
 * wallet while in direct-access mode, and the provider is used directly (not wagmi)
 *
 * The provider routes the call to our logic in the `requests` directory.
 */
export class IframeProvider extends BasePopupProvider {
    protected popupBaseUrl = getWalletURL()

    constructor() {
        super(walletID())
    }

    protected onPopupBlocked() {
        addBanner("popup-blocked")
        // user reject on popup block, to force wagmi to recognize the request termination
        throw new EIP1193UserRejectedRequestError()
    }

    protected override async requiresUserApproval(args: EIP1193RequestParameters): Promise<boolean> {
        // We're logging in or out, wait for the auth state to settle.
        await waitForCondition(() => getAuthState() !== AuthState.Initializing)

        // injected wallets don't need permissions here (handled by the wallet)
        if (this.isInjectedUser) return false

        return checkIfRequestRequiresConfirmation(getWalletURL(), args)
    }

    private get isInjectedUser() {
        return getUser()?.type === WalletType.Injected
    }

    protected override handlePermissionless(key: UUID, args: EIP1193RequestParameters): undefined {
        const req = { key, windowId: walletID(), error: null, payload: args }
        if (this.isInjectedUser) {
            void handleInjectedRequest(req)
        } else {
            void handlePermissionlessRequest(req)
        }
    }

    protected override async requestExtraPermissions(_args: EIP1193RequestParameters): Promise<boolean> {
        // The iframe is auto-connected by default, there is never a need for extra permissions.
        return true
    }

    protected override getChainId(): string {
        return getCurrentChain().chainId
    }
}

export const iframeProvider = new IframeProvider() as IframeProvider & EIP1193Provider
