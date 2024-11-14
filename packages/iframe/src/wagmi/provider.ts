import type { UUID } from "@happychain/common"
import {
    AuthState,
    BasePopupProvider,
    type EIP1193RequestParameters,
    WalletType,
    waitForCondition,
} from "@happychain/sdk-shared"
import type { EIP1193Provider } from "viem"
import { handleInjectedRequest } from "#src/requests/injected.ts"
import { getUser } from "#src/state/user.ts"
import { handlePermissionlessRequest } from "../requests"
import { iframeID } from "../requests/utils"
import { getAuthState } from "../state/authState"
import { getIframeURL } from "../utils/appURL"
import { checkIfRequestRequiresConfirmation } from "../utils/checkPermissions"

/**
 * EIP-1193 provider for transactions initiated from the iframe, most notably used by wagmi.
 *
 * The provider routes the call to our logic in the `requests` directory.
 */
export class IframeProvider extends BasePopupProvider {
    protected popupBaseUrl = getIframeURL()

    constructor() {
        super(iframeID())
    }

    protected override async requiresUserApproval(args: EIP1193RequestParameters): Promise<boolean> {
        // We're logging in or out, wait for the auth state to settle.
        await waitForCondition(() => getAuthState() !== AuthState.Initializing)

        // injected wallets don't need permissions here (handled by metamask)
        if (this.isInjectedUser) return false

        return checkIfRequestRequiresConfirmation(getIframeURL(), args)
    }

    private get isInjectedUser() {
        return getUser()?.type === WalletType.Injected
    }

    protected override handlePermissionless(key: UUID, args: EIP1193RequestParameters): undefined {
        const req = { key, windowId: iframeID(), error: null, payload: args }
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
}

export const iframeProvider = new IframeProvider() as IframeProvider & EIP1193Provider
