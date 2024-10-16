import type { UUID } from "@happychain/common"
import { AuthState, BasePopupProvider, type EIP1193RequestParameters, waitForCondition } from "@happychain/sdk-shared"
import { type EIP1193Provider, ResourceUnavailableRpcError } from "viem"
import { handlePermissionlessRequest } from "../requests"
import { iframeID } from "../requests/utils"
import { getAuthState } from "../state/authState"
import { getUser } from "../state/user"
import { getIframeURL } from "../utils/appURL"
import { checkIfRequestRequiresConfirmation } from "../utils/checkPermissions"

/**
 * EIP-1193 provider for transactions initiated from the iframe, most notably used by wagmi.
 *
 * The provider routes the call to our logic in the `requests` directory.
 */
export class IframeProvider extends BasePopupProvider {
    constructor() {
        super(iframeID())
    }

    protected override async requiresUserApproval(args: EIP1193RequestParameters): Promise<boolean> {
        if (!getUser()) {
            // Necessary because wagmi will attempt to reconnect on page load. This currently could
            // work fine (with a "permission not found" warning), but is brittle, better to
            // explicitly reject here. We explicitly connect to wagmi via `useConnect` once the user
            // becomes available.
            //
            // Wagmi swallows these exceptions, so they won't pollute the console.
            throw new ResourceUnavailableRpcError(new Error("user not initialized yet"))
        }

        // We're logging in or out, wait for the auth state to settle.
        await waitForCondition(() => getAuthState() !== AuthState.Connecting)

        return checkIfRequestRequiresConfirmation(getIframeURL(), args)
    }

    protected override handlePermissionless(key: UUID, args: EIP1193RequestParameters): undefined {
        void handlePermissionlessRequest({
            key,
            windowId: iframeID(),
            error: null,
            payload: args,
        })
    }

    protected override async requestExtraPermissions(_args: EIP1193RequestParameters): Promise<boolean> {
        // The iframe is auto-connected by default, there is never a need for extra permissions.
        return true
    }
}

export const iframeProvider = new IframeProvider() as IframeProvider & EIP1193Provider
