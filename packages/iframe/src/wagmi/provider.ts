import type { UUID } from "@happychain/common"
import {
    AuthState,
    BasePopupProvider,
    type EIP1193RequestMethods,
    type EIP1193RequestParameters,
    type EIP1193RequestResult,
    type InFlightRequest,
    waitForCondition,
} from "@happychain/sdk-shared"
import { type EIP1193Provider, ResourceUnavailableRpcError } from "viem"
import { handlePermissionlessRequest } from "../requests"
import { handleApprovedRequest } from "../requests/approved"
import { iframeID } from "../requests/utils"
import { getAuthState } from "../state/authState"
import { getUser } from "../state/user"
import { checkIfRequestRequiresConfirmation } from "../utils/checkPermissions"

// custom type for promise resolve methods
type ResolveType<T extends EIP1193RequestMethods = EIP1193RequestMethods> = (value: EIP1193RequestResult<T>) => void

/**
 * Custom Provider for the iframe fed to WagmiProvider's config to route wagmi
 * hook calls to our middleware functions (where viem handles the calls).
 *
 * Provider is fed into a {@link https://wagmi.sh/core/api/connectors/injected#target | custom Connector}
 * which is configured to represent the HappyChain's iframe provider as below.
 */
export class IframeProvider extends BasePopupProvider {
    public isConnected(): boolean {
        throw new Error("Method not implemented.")
    }

    protected override async requiresUserApproval(args: EIP1193RequestParameters): Promise<boolean> {
        return checkIfRequestRequiresConfirmation(args)
    }

    protected override async handlePermissionless(
        key: UUID,
        args: EIP1193RequestParameters,
        { resolve, reject }: InFlightRequest,
    ): Promise<void> {
        const reqPayload = {
            key,
            windowId: iframeID,
            error: null,
            payload: args,
        }

        void handlePermissionlessRequest(reqPayload)
        this.trackRequest(key, { resolve: resolve as ResolveType, reject })
        return
    }

    protected override async requestPermissions(
        key: UUID,
        args: EIP1193RequestParameters,
        { resolve, reject }: InFlightRequest,
    ): Promise<boolean | unknown> {
        const reqPayload = {
            key,
            windowId: iframeID,
            error: null,
            payload: args,
        }

        if (["eth_requestAccounts", "wallet_requestPermissions"].includes(args?.method)) {
            // auto-approve internal iframe permissions without popups
            void handleApprovedRequest(reqPayload)
            this.trackRequest(key, { resolve: resolve as ResolveType, reject })
            return
        }
    }

    protected override async performOptionalUserAndAuthCheck(): Promise<void> {
        if (!getUser()) {
            // Necessary because wagmi will attempt to reconnect on page load. This currently could
            // work fine (with a permission not found warning), but is brittle, better to explicitly
            // reject here. We explicitly connect to wagmi via `useConnect` once the user becomes
            // available.

            throw new ResourceUnavailableRpcError(new Error("user not initialized yet"))
        }

        await waitForCondition(() => getAuthState() !== AuthState.Connecting)
    }
}

export const iframeProvider = new IframeProvider() as IframeProvider & EIP1193Provider
