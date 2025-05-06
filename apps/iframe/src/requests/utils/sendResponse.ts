import {
    type EIP1193RequestParameters,
    Msgs,
    type ProviderEventPayload,
    WalletType,
    getEIP1193ErrorObjectFromUnknown,
    EIP1474InternalError,
} from "@happy.tech/wallet-common"
// biome-ignore lint/correctness/noUnusedImports: keep type for doc
import type { UnauthorizedProviderError } from "viem"
import { InjectedProviderProxy } from "#src/connections/InjectedProviderProxy.ts"
import { reqLogger } from "#src/logger"
import { getUser } from "#src/state/user.ts"
import { happyProviderBus } from "#src/services/eventBus"
import { appForSourceID, isIframe } from "#src/utils/appURL"
import { iframeProvider } from "#src/wagmi/provider"

/**
 * Runs the supplied dispatch function on the supplied request, sending the response back to the app
 * in case of success, or processing any thrown error and sending that back to the app.
 *
 * The function checks whether the request originated from either the parent window or the internal iframe,
 * based on the provided `windowId`. If the request comes from the parent window, it emits a response via
 * the `happyProviderBus`. If the request originates from the internal iframe (from the wagmi provider),
 * the response is handled by the `iframeProvider`.
 *
 * @param request - The request object containing EIP1193 request parameters and the originating `windowId`.
 * @param dispatch - The function responsible for processing the request and generating a response payload.
 * @returns {Promise<void>} - The function does not return a value but instead sends the response via
 *                            the appropriate channel (parent window - message bus, or iframe).
 * @throws {UnauthorizedProviderError} - If the user is not authenticated when the request is dispatched.
 */
export async function sendResponse<Request extends ProviderEventPayload<EIP1193RequestParameters>, T>(
    request: Request,
    dispatch: (request: Request) => Promise<T>,
): Promise<void> {
    const app = appForSourceID(request.windowId)
    if (!app) {
        reqLogger.error("Unsupported source app, abandoning request", app, request)
        throw new EIP1474InternalError(`Unsupported source app: ${app}`)
    }

    try {
        const payload = await dispatch(request)

        const response = {
            key: request.key,
            windowId: request.windowId,
            error: null,
            payload: payload ?? undefined,
        }

        const _isIframe = isIframe(app)
        const _isInjected = getUser()?.type === WalletType.Injected

        if (_isIframe && _isInjected) {
            InjectedProviderProxy.getInstance().handleRequestResolution(response)
        } else if (_isIframe) {
            iframeProvider.handleRequestResolution(response)
        } else {
            void happyProviderBus.emit(Msgs.RequestResponse, response)
        }
    } catch (e) {
        reqLogger.info("request handling threw", e)
        const response = {
            key: request.key,
            windowId: request.windowId,
            error: getEIP1193ErrorObjectFromUnknown(e),
            payload: null,
        }

        const _isIframe = isIframe(app)
        const _isInjected = getUser()?.type === WalletType.Injected

        if (_isIframe && _isInjected) {
            InjectedProviderProxy.getInstance().handleRequestResolution(response)
        } else if (_isIframe) {
            iframeProvider.handleRequestResolution(response)
        } else {
            void happyProviderBus.emit(Msgs.RequestResponse, response)
        }
    }
}
