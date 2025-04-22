import { type UUID, createUUID } from "@happy.tech/common"
import { AuthState, EIP1193UnauthorizedError } from "@happy.tech/wallet-common"
import { getAuthState } from "../state/authState"
import { type AppURL, getAppURL, getIframeURL, isIframe } from "../utils/appURL"

/** ID passed to the iframe by the parent window (app). */
const _parentID = new URLSearchParams(window.location.search).get("windowId")

if (!isIframe(getAppURL()) && !_parentID && process.env.NODE_ENV !== "test") {
    console.warn("Iframe initialized without windowId")
}

/** ID generated for this iframe (tied to a specific app). */
const _iframeID = createUUID()

/** ID generated for this iframe (tied to a specific app). */
// Expose as a function so that the function can be mocked.
export function iframeID(): UUID {
    return _iframeID
}

/**
 * Returns the app URL for the source ID, or undefined if the source ID is not allowed (i.e. neither
 * the iframe nor its parent).
 */
export function appForSourceID(sourceId: UUID): AppURL | undefined {
    if (sourceId === _parentID) return getAppURL()
    if (sourceId === _iframeID) return getIframeURL()
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
