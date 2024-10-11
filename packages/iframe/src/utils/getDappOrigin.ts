import type { HTTPString } from "@happychain/common"

export function getIframeOrigin(): HTTPString {
    return location.origin as HTTPString
}

const dappOrigin = new URL(location.ancestorOrigins?.[0] ?? document.referrer).origin

export function getDappOrigin(): HTTPString {
    if (!dappOrigin) {
        console.warn("Unable to determine dApp Origin")
        return getIframeOrigin()
    }
    return dappOrigin as HTTPString
}
