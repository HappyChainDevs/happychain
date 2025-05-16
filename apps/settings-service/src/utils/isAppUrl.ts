import type { AppURL } from "../db/types"

export function isAppUrl(urlString: string): urlString is AppURL {
    try {
        const url = new URL(urlString)
        return url.protocol === "http:" || url.protocol === "https:"
    } catch {
        return false
    }
}
