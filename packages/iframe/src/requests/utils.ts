import { type HTTPString, type UUID, createUUID } from "@happychain/common"
import {
    AuthState,
    type EIP1193RequestParameters,
    EIP1193UnauthorizedError,
    Msgs,
    type ProviderEventPayload,
    type ProviderMsgsFromIframe,
    getEIP1193ErrorObjectFromUnknown,
} from "@happychain/sdk-shared"
import { happyProviderBus } from "../services/eventBus"
import { getAuthState } from "../state/authState"
import { getDappOrigin, getIframeOrigin } from "../utils/getDappOrigin.ts"
import { iframeProvider } from "../wagmi/provider"

/** ID passed to the iframe by the parent window (app). */
export const parentID = new URLSearchParams(window.location.search).get("windowId")

/** ID generated for this iframe (tied to a specific app). */
export const iframeID = createUUID()

/** Whether the source ID is allowed: either the iframe or its parent (app). */
export const isAllowedSourceId = (sourceId: UUID) => {
    return sourceId === parentID || sourceId === iframeID
}

/**
 * Returns the origin URL for the source ID, or undefined if the source ID is not allowed (i.e.
 * neither the iframe nor its parent).
 */
export function originForSourceID(sourceId: UUID): HTTPString | undefined {
    if (sourceId === parentID) return getDappOrigin()
    if (sourceId === iframeID) return getIframeOrigin()
    return undefined
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
    let response: ProviderMsgsFromIframe[Msgs.RequestResponse] | undefined
    try {
        if (!isAllowedSourceId(request.windowId)) return
        const payload = await dispatch(request)
        response = {
            key: request.key,
            windowId: request.windowId,
            error: null,
            payload: payload ?? undefined,
        }
    } catch (e) {
        response = {
            key: request.key,
            windowId: request.windowId,
            error: getEIP1193ErrorObjectFromUnknown(e),
            payload: null,
        }
    } finally {
        if (!response) {
            // noop
        } else if (request.windowId === parentID) {
            void happyProviderBus.emit(Msgs.RequestResponse, response)
        } else if (request.windowId === iframeID) {
            void iframeProvider.handleRequestResolution(response)
        } else {
            console.warn("Unsupported request source", request.windowId)
        }
    }
}
