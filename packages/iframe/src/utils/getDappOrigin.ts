export function getDappOrigin() {
    const origin = document.referrer as `http://${string}` | `https://${string}`
    if (!origin) {
        console.warn("Unable to determine dApp Origin")
        return window.location.origin
    }
    return origin
}
