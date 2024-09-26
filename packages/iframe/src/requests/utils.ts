import {
    AuthState,
    type EIP1193RequestParameters,
    EIP1193UnauthorizedError,
    Msgs,
    type ProviderEventPayload,
    getEIP1193ErrorObjectFromUnknown,
} from "@happychain/sdk-shared"
import { happyProviderBus } from "../services/eventBus"
import { getAuthState } from "../state/authState"
import { iframeProvider } from "../wagmi/provider"

/** ID passed to the iframe by the parent window. */
const parentID = new URLSearchParams(window.location.search).get("windowId")

/** Confirms if the request comes from the parent window or the iframe. */
export const confirmSourceId = (windowId: ReturnType<typeof crypto.randomUUID>) => {
    return windowId === parentID || windowId === iframeProvider.iframeWindowId
}

/**
 * Check if the user is authenticated with the social login provider, otherwise throws an error.
 * @throws {EIP1193UnauthorizedError}
 */
export function checkAuthenticated() {
    if (getAuthState() !== AuthState.Connected) {
        throw new EIP1193UnauthorizedError()
    }
}

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
    try {
        if (confirmSourceId(request.windowId)) {
            const payload = await dispatch(request)
            const response = {
                key: request.key,
                windowId: request.windowId,
                error: null,
                payload: payload || {},
            }

            if (request.windowId === parentID) {
                void happyProviderBus.emit(Msgs.RequestResponse, response)
            } else {
                iframeProvider.handleRequestResolution(response)
            }
        }
    } catch (e) {
        if (confirmSourceId(request.windowId)) {
            const response = {
                key: request.key,
                windowId: request.windowId,
                error: getEIP1193ErrorObjectFromUnknown(e),
                payload: null,
            }

            if (request.windowId === parentID) {
                void happyProviderBus.emit(Msgs.RequestResponse, response)
            } else {
                iframeProvider.handleRequestResolution(response)
            }
        }
    }
}
