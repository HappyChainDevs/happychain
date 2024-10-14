import type { HTTPString } from "@happychain/common"

export function getIframeOrigin(): HTTPString {
    return location.origin as HTTPString
}

const dappURL = location.ancestorOrigins?.[0] ?? document.referrer
const dappOrigin = dappURL ? new URL(dappURL).origin : ""

export function getDappOrigin(): HTTPString {
    if (!dappOrigin) {
        console.warn("Unable to determine dApp Origin")
        return getIframeOrigin()
    }
    return dappOrigin as HTTPString
}
