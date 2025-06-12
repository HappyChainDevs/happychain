import type { UnionFill } from "../utils/types"

export function getUrlProtocol(url: string): UnionFill<{ result: "http" | "websocket" } | { error: Error }> {
    const parsedUrl = new URL(url)

    const protocol = parsedUrl.protocol.replace(":", "")

    if (protocol === "http" || protocol === "https") {
        return {
            result: "http",
        }
    }

    if (protocol === "ws" || protocol === "wss") {
        return {
            result: "websocket",
        }
    }

    return {
        error: new Error(`Protocol not supported: ${protocol}`),
    }
}
