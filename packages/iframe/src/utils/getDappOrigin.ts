export type URLString = `http://${string}` | `https://${string}`

export function getIframeOrigin(): URLString {
    return location.origin as URLString
}

export function getDappOrigin(): URLString {
    const origin = document.referrer
    if (!origin) {
        console.warn("Unable to determine dApp Origin")
        return getIframeOrigin()
    }
    return origin as URLString
}
