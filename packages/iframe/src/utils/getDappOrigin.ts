import type { HTTPString } from "@happychain/common"

export function getIframeOrigin(): HTTPString {
    return location.origin as HTTPString
}

export function getDappOrigin(): HTTPString {
    const origin = document.referrer ? new URL(document.referrer).origin : null
    if (!origin) {
        console.warn("Unable to determine dApp Origin")
        return getIframeOrigin()
    }
    return origin as HTTPString
}
