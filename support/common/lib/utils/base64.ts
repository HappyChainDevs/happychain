export function encodeUrlSafeBase64(json: object) {
    return btoa(JSON.stringify(json)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function decodeUrlSafeBase64(str: string) {
    str = str.replace(/-/g, "+").replace(/_/g, "/")
    while (str.length % 4) str += "="
    return JSON.parse(atob(str))
}
