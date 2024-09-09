export type URLString = `http://${string}` | `https://${string}`

export function getDappOrigin(): URLString {
    const origin = document.referrer
    if (!origin) {
        return window.location.origin as URLString
    }
    return origin as URLString
}
