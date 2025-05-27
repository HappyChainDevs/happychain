import { serve } from "@hono/node-server"
import { Hono } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"

export enum ProxyBehavior {
    Forward = "Forward",
    NotAnswer = "NotAnswer",
    Fail = "Fail",
}

export enum ProxyMode {
    Deterministic = "Deterministic",
    Random = "Random",
}

export class ProxyServer {
    readonly #PROXY_PORT: number
    private app: Hono
    private nextBehaviors: ProxyBehavior[]
    private mode: ProxyMode
    private randomProbs:
        | {
              [key in ProxyBehavior]: number
          }
        | undefined

    constructor(ANVIL_PORT: number, PROXY_PORT: number) {
        this.#PROXY_PORT = PROXY_PORT
        this.app = new Hono()
        this.nextBehaviors = []
        this.mode = ProxyMode.Deterministic
        this.app.post("*", async (c) => {
            if (this.mode === ProxyMode.Random && this.randomProbs) {
                const random = Math.random()

                if (random < this.randomProbs[ProxyBehavior.NotAnswer]) {
                    return
                }
                if (random < this.randomProbs[ProxyBehavior.Fail]) {
                    return c.json({ error: "Proxy error" }, 500)
                }
            }

            const body = await c.req.json()
            if (body.method === "eth_sendRawTransaction" && this.mode === ProxyMode.Deterministic) {
                const behavior = this.nextBehaviors.shift() ?? ProxyBehavior.Forward
                if (behavior === ProxyBehavior.NotAnswer) {
                    return
                }
                if (behavior === ProxyBehavior.Fail) {
                    return c.json({ error: "Proxy error" }, 500)
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

    public setMode(mode: ProxyMode.Random, probs: { [key in ProxyBehavior]: number }): void
    public setMode(mode: Exclude<ProxyMode, ProxyMode.Random>): void
    public setMode(mode: ProxyMode, probs?: { [key in ProxyBehavior]: number }) {
        this.mode = mode
        if (mode === ProxyMode.Random) {
            if (!probs) {
                throw new Error("You must provide probs when mode is Random")
            }
            const sum = Object.values(probs).reduce((a, b) => a + b, 0)
            if (sum !== 1) {
                throw new Error("Probs must sum to 1")
            }
            this.randomProbs = probs
        } else {
            this.randomProbs = undefined
        }
    }

    public setRandomProbs(probs: { [key in ProxyBehavior]: number }) {
        this.randomProbs = probs
    }

    public async start() {
        serve({
            fetch: this.app.fetch,
            port: this.#PROXY_PORT,
        })
    }
}
