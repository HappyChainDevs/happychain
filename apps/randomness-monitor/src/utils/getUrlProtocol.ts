import { type Result, err, ok } from "neverthrow"

export function getUrlProtocol(url: string): Result<"http" | "websocket", Error> {
    const parsedUrl = new URL(url)

    const protocol = parsedUrl.protocol.replace(":", "")

    if (protocol === "http" || protocol === "https") {
        return ok("http")
    }

    if (protocol === "ws" || protocol === "wss") {
        return ok("websocket")
    }

    return err(new Error(`Protocol not supported: ${protocol}`))
}
