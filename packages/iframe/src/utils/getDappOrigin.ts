export type URLString = `http://${string}` | `https://${string}`

export function getDappOrigin(): URLString {
    const origin = document.referrer
    if (!origin) {
        console.warn("Unable to determine dApp Origin")
        return window.location.origin as URLString
    }
    return origin as URLString
}
