import { type UUID, createUUID } from "@happychain/common"
import { AuthState, EIP1193UnauthorizedError } from "@happychain/sdk-shared"
import { getAuthState } from "../state/authState"

/** ID passed to the iframe by the parent window. */
export const parentID = new URLSearchParams(window.location.search).get("windowId")

/** ID of the internal iframe provider instance */
export const iframeID = createUUID()

/** Whether the source ID is allowed: either the iframe or its parent (app). */
export const isAllowedSourceId = (sourceId: UUID) => {
    return isParentId(sourceId) || isIframeId(sourceId)
}

export const isParentId = (sourceId: UUID) => {
    return sourceId === parentID
}
export const isIframeId = (sourceId: UUID) => {
    return sourceId === iframeID
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
