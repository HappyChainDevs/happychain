import { serve } from "@hono/node-server"
import { Hono } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { ANVIL_PORT, PROXY_PORT } from "./constants"

export enum ProxyBehavior {
    Forward = "Forward",
    NotAnswer = "NotAnswer",
}

export class ProxyServer {
    private app: Hono
    private nextBehaviors: ProxyBehavior[]

    constructor() {
        this.app = new Hono()
        this.nextBehaviors = []

        this.app.post("*", async (c) => {
            const body = await c.req.json()
            if (body.method === "eth_sendRawTransaction") {
                const behavior = this.nextBehaviors.shift() ?? ProxyBehavior.Forward
                if (behavior === ProxyBehavior.NotAnswer) {
                    return
                }
            }
            const reqUrl = new URL(c.req.url)
            const targetUrl = new URL(reqUrl.pathname + reqUrl.search, `http://localhost:${ANVIL_PORT}`)

            try {
                const response = await fetch(targetUrl.toString(), {
                    method: c.req.method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                })
                const data = await response.json()
                return c.json(data, response.status as ContentfulStatusCode)
            } catch (_) {
                return c.json({ error: "Proxy error" }, 500)
            }
        })
    }

    public addBehavior(behavior: ProxyBehavior) {
        this.nextBehaviors.push(behavior)
    }

    public async start() {
        serve({
            fetch: this.app.fetch,
            port: PROXY_PORT,
        })
    }
}
