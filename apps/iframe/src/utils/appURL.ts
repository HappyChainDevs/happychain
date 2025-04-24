import { createUUID, type HTTPString, type UUID } from "@happy.tech/common"

export type AppURL = HTTPString & { _brand: "AppHTTPString" }

export function getIframeURL(): AppURL {
    return location.origin as AppURL
}

const _appURL = location.ancestorOrigins?.[0] ?? document.referrer
const _appOrigin = _appURL ? new URL(_appURL).origin : ""
const appURL = _appOrigin && _appOrigin !== getIframeURL() ? _appOrigin : ""

/**
 * Return true iff we're displayed the iframe directly (not embedded in an app).
 */
export function isStandaloneIframe(): boolean {
    return !appURL
}

/**
 * Return true iff the given URL is the iframe.
 */
export function isIframe(app: AppURL): boolean {
    return app === getIframeURL()
}

/**
 * Return true iff the given URL is the app.
 *
 * WARNING: In standalone mode this returns true as the iframe is the app.
 * Use {@link isIframe} or {@link isStandaloneIframe} to disambiguate
 */
export function isApp(app: AppURL): boolean {
    return app === getAppURL()
}

export function getAppURL(): AppURL {
    if (!appURL) {
        // In standalone mode, the iframe IS the app.
        return getIframeURL()
    }
    return appURL as AppURL
}

/** ID passed to the iframe by the parent window (app). */
export const _parentID = new URLSearchParams(window.location.search).get("windowId")

/** ID generated for this iframe (tied to a specific app). */
const _iframeID = createUUID()

if (!isIframe(getAppURL()) && !_parentID && process.env.NODE_ENV !== "test") {
    console.warn("Iframe initialized without windowId")
}

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
