export function getDappOrigin() {
    const origin = document.referrer as `http://${string}` | `https://${string}`
    if (!origin) {
        throw new Error("Unable to determine dApp Origin")
    }
    return origin
}
