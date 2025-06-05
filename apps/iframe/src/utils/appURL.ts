import { type HTTPString, type UUID, createUUID } from "@happy.tech/common"

export type AppURL = HTTPString & { _brand: "AppHTTPString" }

/** The full url of the app that the wallet is embedded in. */
const _appURL = import.meta.hot?.data._appURL ?? location.ancestorOrigins?.[0] ?? document.referrer

/** the origin of the app that the wallet is embedded in, or empty if not embedded */
const _appOrigin = import.meta.hot?.data._appOrigin ?? (_appURL ? new URL(_appURL).origin : "")

/** The url of the App the wallet is embedded in, or empty if not embedded. */
const appURL = import.meta.hot?.data.appURL ?? (_appOrigin && _appOrigin !== location.origin ? _appOrigin : "")

/** ID passed to the iframe by the parent window (app). */
export const _parentID = import.meta.hot?.data._parentID ?? new URLSearchParams(window.location.search).get("windowId")

/** ID generated for this wallet (tied to a specific app). */
const _walletID = import.meta.hot?.data._walletID ?? createUUID()

if (!isWallet(getAppURL()) && !_parentID) {
    console.warn("Embedded Wallet initialized without windowId")
}

/**
 * Returns the URL of the wallet itself
 */
export function getWalletURL(): AppURL {
    return location.origin as AppURL
}

/**
 * Gets the URL of the current active 'app'. In embedded mode, this is the parent app,
 * however in standalone mode, this is the wallet itself.
 */
export function getAppURL(): AppURL {
    if (!appURL) return getWalletURL()
    return appURL as AppURL
}

/**
 * Return true iff we're displayed the wallet directly (not embedded in an app).
 */
export function isStandaloneWallet(): boolean {
    return !appURL
}

/**
 * Return true iff we're displayed the wallet embedded in an app.
 */
export function isEmbeddedWallet(): boolean {
    return !!appURL
}

/**
 * Return true iff the given URL is the wallet.
 */
export function isWallet(app: AppURL): boolean {
    return app === getWalletURL()
}

/**
 * Return true iff the given URL is the app.
 *
 * WARNING: In standalone mode this returns true as the wallet is the app.
 * Use {@link isWallet} or {@link isStandaloneWallet} to disambiguate
 */
export function isApp(app: AppURL): boolean {
    return app === getAppURL()
}

/** ID generated for this wallet (tied to a specific app). */
// Expose as a function so that the function can be mocked.
export function walletID(): UUID {
    return _walletID
}

/**
 * Returns the app URL for the source ID, or undefined if the source ID is not allowed (i.e. neither
 * the iframe nor its parent).
 */
export function appForSourceID(sourceID: UUID): AppURL | undefined {
    if (sourceID === _parentID) return getAppURL()
    if (sourceID === _walletID) return getWalletURL()
    return undefined
}

/** Persist constants across hot-reloads */
if (import.meta.hot) {
    import.meta.hot.data._parentID = _parentID
    import.meta.hot.data._appURL = _appURL
    import.meta.hot.data._appOrigin = _appOrigin
    import.meta.hot.data.appURL = appURL
    import.meta.hot.data._walletID = _walletID
    import.meta.hot.accept()
}
