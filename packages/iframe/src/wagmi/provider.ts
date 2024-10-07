import { createUUID, type UUID } from "@happychain/common"
import {
    AuthState,
    BasePopupProvider,
    type EIP1193ErrorObject,
    type EIP1193RequestParameters,
    type EIP1193RequestResult,
    GenericProviderRpcError,
    type ProviderEventError,
    type ProviderEventPayload,
    type ResolveType,
    config,
    waitForCondition,
} from "@happychain/sdk-shared"
import { type EIP1193Provider, ResourceUnavailableRpcError } from "viem"
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
    protected async requiresUserApproval(args: EIP1193RequestParameters): Promise<boolean> {
        return checkIfRequestRequiresConfirmation(args)
    }

    protected handlePermissionlessRequest(
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

        this.queueRequest(key, { resolve: resolve as ResolveType, reject })
        return
    }

    protected override async requestPermissions(): Promise<boolean> {
        return false
    }

    openPopupAndAwaitResponse(key: UUID, args: EIP1193RequestParameters) {
        const url = new URL("request", config.iframePath)
        const opts = {
            windowId: iframeID,
            key: key,
            args: btoa(JSON.stringify(args)),
        }
        const searchParams = new URLSearchParams(opts).toString()
        return window.open(`${url}?${searchParams}`, "_blank", IframeProvider.POPUP_FEATURES)
    }

    public handleRequestResolution(
        data: ProviderEventPayload<EIP1193RequestResult> | ProviderEventError<EIP1193ErrorObject>,
    ) {
        const req = this.inFlightRequests.get(data.key)

        if (!req) {
            return { resolve: null, reject: null }
        }

        const { resolve, reject, popup } = req
        this.inFlightRequests.delete(data.key)
        popup?.close()

        if (reject && data.error) {
            reject(
                new GenericProviderRpcError({
                    code: data.error.code,
                    message: data.error.message,
                    data: data.error.data,
                }),
            )
        } else if (resolve) {
            resolve(data.payload)
        } else {
            // no key associated, perhaps from another tab context?
        }
    }

    override isConnected(): boolean {
        return true
    }
}

export const iframeProvider = new IframeProvider() as IframeProvider & EIP1193Provider
