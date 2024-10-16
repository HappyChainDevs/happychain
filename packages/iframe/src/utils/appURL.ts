import type { HTTPString } from "@happychain/common"
import { logger } from "@happychain/sdk-shared"

export type AppURL = HTTPString & { _brand: "AppHTTPString" }

export function getIframeURL(): AppURL {
    return location.origin as AppURL
}

const _appURL = location.ancestorOrigins?.[0] ?? document.referrer
const appURL = _appURL ? new URL(_appURL).origin : ""

export function getAppURL(): AppURL {
    if (!appURL) {
        // This is expected in standalone mode.
        // Should be removed when the standalone mode gets some love
        logger.warn("Unable to determine app URL")
        return getIframeURL()
    }
    return appURL as AppURL
}
