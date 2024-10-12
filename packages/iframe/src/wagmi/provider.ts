import type { UUID } from "@happychain/common"
import { BasePopupProvider, type EIP1193RequestParameters, type ResolveType } from "@happychain/sdk-shared"
import type { InFlightRequest } from "@happychain/sdk-shared"
import type { EIP1193Provider } from "viem"
import { handlePermissionlessRequest } from "../requests"
import { handleApprovedRequest } from "../requests/approved"
import { iframeID } from "../requests/utils"
import { getAuthState } from "../state/authState"
import { getUser } from "../state/user"
import { checkIfRequestRequiresConfirmation } from "../utils/checkPermissions"

/**
 * Custom Provider for the iframe fed to WagmiProvider's config to route wagmi
 * hook calls to our middleware functions (where viem handles the calls).
 *
 * Provider is fed into a {@link https://wagmi.sh/core/api/connectors/injected#target | custom Connector}
 * which is configured to represent the HappyChain's iframe provider as below.
 */
export class IframeProvider extends BasePopupProvider {
    protected override handlePermissionlessRequest(
        key: UUID,
        args: EIP1193RequestParameters,
        { resolve, reject }: InFlightRequest,
    ): void {
        const permissionlessReqPayload = {
            key,
            windowId: this.windowId,
            error: null,
            payload: args,
        }

        // auto-approve
        void handlePermissionlessRequest(permissionlessReqPayload)
        this.trackRequest(key, { resolve: resolve as ResolveType, reject })
        return
    }

    protected override async requestPermissions(): Promise<boolean> {
        /**
         * note: namesake function in `SocialWalletHandler` returns true once
         * necessary permissions are granted and request is handled;
         * not required here.
         * */
        return false
    }

    override isConnected(): boolean {
        return true
    }

    protected override async requiresUserApproval(args: EIP1193RequestParameters): Promise<boolean> {
        return checkIfRequestRequiresConfirmation(args)
    }
}

export const iframeProvider = new IframeProvider() as IframeProvider & EIP1193Provider
