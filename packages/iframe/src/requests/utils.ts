import { type HTTPString, type UUID, createUUID } from "@happychain/common"
import { AuthState, EIP1193UnauthorizedError } from "@happychain/sdk-shared"
import { getAuthState } from "../state/authState"
import { getDappOrigin, getIframeOrigin } from "../utils/getDappOrigin.ts"

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
