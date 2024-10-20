import type { HTTPString } from "@happychain/common"

export type AppURL = HTTPString & { _brand: "AppHTTPString" }

export function getIframeURL(): AppURL {
    return location.origin as AppURL
}

const _appURL = location.ancestorOrigins?.[0] ?? document.referrer
const appURL = _appURL ? new URL(_appURL).origin : ""

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
