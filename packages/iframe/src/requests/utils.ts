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

/** Don't process requests coming from windows other than the parent window. */
export const confirmWindowId = (windowId: ReturnType<typeof crypto.randomUUID>) => windowId === parentID

/** Check if request has originated from within the iframe itself, from the internal wagmi provider. */
export const confirmIframeId = (windowId: ReturnType<typeof crypto.randomUUID>) =>
    windowId === iframeProvider.iframeWindowId

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
 */
export async function sendResponse<Request extends ProviderEventPayload<EIP1193RequestParameters>, T>(
    request: Request,
    dispatch: (request: Request) => Promise<T>,
): Promise<void> {
    try {
        if (confirmWindowId(request.windowId)) {
            const payload = await dispatch(request)
            void happyProviderBus.emit(Msgs.RequestResponse, {
                key: request.key,
                windowId: request.windowId,
                error: null,
                payload: payload || {},
            })
        } else if (confirmIframeId(request.windowId)) {
            const payload = await dispatch(request)
            iframeProvider.handleRequestResolution({
                key: request.key,
                windowId: request.windowId,
                error: null,
                payload: payload || {},
            })
            return
        }
    } catch (e) {
        // how do we want to handle the error case for internal iframe calls, with the same check as above?
        void happyProviderBus.emit(Msgs.RequestResponse, {
            key: request.key,
            windowId: request.windowId,
            error: getEIP1193ErrorObjectFromUnknown(e),
            payload: null,
        })
    }
}
