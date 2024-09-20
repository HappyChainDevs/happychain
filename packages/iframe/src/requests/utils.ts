import {
    AuthState,
    type EIP1193RequestParameters,
    Msgs,
    type ProviderEventPayload,
    getEIP1193ErrorObjectFromUnknown,
} from "@happychain/sdk-shared"
import { UnauthorizedProviderError } from "viem"
import { happyProviderBus } from "../services/eventBus.ts"
import { getAuthState } from "../state/authState.ts"

/** ID assigned to the iframe by the parent window. */
const iframeUUID = new URLSearchParams(window.location.search).get("windowId")

/** Don't process requests coming from windows other than the parent window. */
export const confirmWindowId = (windowId: ReturnType<typeof crypto.randomUUID>) => windowId === iframeUUID

/**
 * Check if the user is authenticated with the social login provider, otherwise throws an error.
 * @throws {UnauthorizedProviderError}
 */
export function checkAuthenticated() {
    if (getAuthState() !== AuthState.Connected) {
        throw new UnauthorizedProviderError(new Error("Not allowed"))
    }
}

/**
 *
 * Runs the supplied dispatch function on the supplied request, sending the response back to the app
 * in case of success, or processing any thrown error and sending that back to the app.
 */
export async function sendResponse<Request extends ProviderEventPayload<EIP1193RequestParameters>, T>(
    request: Request,
    dispatch: (request: Request) => Promise<T>,
): Promise<void> {
    try {
        if (!confirmWindowId(request.windowId)) return
        const payload = await dispatch(request)
        void happyProviderBus.emit(Msgs.RequestResponse, {
            key: request.key,
            windowId: request.windowId,
            error: null,
            payload: payload || {},
        })
    } catch (e) {
        void happyProviderBus.emit(Msgs.RequestResponse, {
            key: request.key,
            windowId: request.windowId,
            error: getEIP1193ErrorObjectFromUnknown(e),
            payload: null,
        })
    }
}
