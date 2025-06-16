import type { Server } from "node:http"
import type { Http2SecureServer, Http2Server } from "node:http2"
import { type Logger, type TaggedLogger, stringify } from "@happy.tech/common"
import { waitForCondition } from "@happy.tech/common"
import { serve } from "@hono/node-server"
import { createNodeWebSocket } from "@hono/node-ws"
import { Hono } from "hono"
import { cors } from "hono/cors"
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
    readonly #ANVIL_PORT: number
    private app: Hono
    private nextBehaviors: ProxyBehavior[]
    private mode: ProxyMode
    private randomProbs?: { [key in ProxyBehavior]: number }
    private injectWebSocket?: (server: Server | Http2Server | Http2SecureServer) => void

    get upstreamHttpUrl() {
        return `http://localhost:${this.#ANVIL_PORT}`
    }

    get upstreamWsUrl() {
        return `ws://localhost:${this.#ANVIL_PORT}`
    }
    constructor(
        ANVIL_PORT: number,
        PROXY_PORT: number,
        private logger?: TaggedLogger,
    ) {
        this.#PROXY_PORT = PROXY_PORT
        this.#ANVIL_PORT = ANVIL_PORT
        this.app = new Hono()

        this.nextBehaviors = []
        this.mode = ProxyMode.Deterministic

        // Enable basic cors support for easier debugging and usage in browser contexts.
        this.app.use("*", cors())
        this.#setupWebsocketProxy()
        this.#setupHttpProxy()
    }

    public addBehavior(behavior: ProxyBehavior) {
        this.nextBehaviors.push(behavior)
    }

    public setMode(mode: ProxyMode.Random, probs: { [key in ProxyBehavior]: number }): void
    public setMode(mode: Exclude<ProxyMode, ProxyMode.Random>): void
    public setMode(mode: ProxyMode, probs?: { [key in ProxyBehavior]: number }) {
        this.logger?.trace("Setting ProxyServer mode", { mode, probs })
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
        this.logger?.trace("Setting ProxyServer probability", { probs })
        this.randomProbs = probs
    }

    public async start() {
        const server = serve({
            fetch: this.app.fetch,
            port: this.#PROXY_PORT,
        })
        this.injectWebSocket?.(server)
    }

    #setupWebsocketProxy() {
        const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app: this.app })
        this.injectWebSocket = injectWebSocket
        this.app.get(
            "*",
            upgradeWebSocket((_c) => {
                const anvilClient = new WebSocket(this.upstreamWsUrl)

                // track JSON request IDS to Responses
                const requestIdMap = new Map()

                return {
                    // on new messages, forward to anvil
                    onMessage: (msg, appClient) => {
                        const parsed = JSON.parse(msg.data.toString())
                        const response = this.#getNextBehavior(parsed.method)
                        if (response === ProxyBehavior.NotAnswer) return
                        if (response === ProxyBehavior.Fail) {
                            return appClient.send(
                                JSON.stringify({
                                    id: parsed.id,
                                    jsonrpc: "2.0",
                                    error: { code: -32603, message: "Internal error - Proxy Denied" },
                                }),
                            )
                        }

                        requestIdMap.set(parsed.id, { data: parsed, start: performance.now() })

                        waitForCondition(() => anvilClient.readyState === WebSocket.OPEN, 1000, 100)
                            .then(() => anvilClient.send(msg.data as never))
                            .catch(() =>
                                this.logger?.error(
                                    "Anvil WS Client is not yet open, cannot forward message through the Proxy WS Server",
                                ),
                            )
                    },
                    onClose: () => {
                        // cleanup
                        anvilClient.close()
                    },
                    // Subscribe to anvil and forward messages to the client
                    onOpen: (_, appClient) => {
                        anvilClient.addEventListener("message", (msg) => {
                            const parsed = JSON.parse(msg.data.toString())
                            const cached = requestIdMap.get(parsed.id)
                            // calls such as eth_getBlockNumber will be cached and identified by the
                            // JSON-RPC id. websocket pushes such as from eth_subscription will not
                            // have an 'id' to respond to, so time benchmarks are meaningless
                            if (cached) {
                                this.logger?.trace(
                                    `(websocket) ${(Math.round((performance.now() - cached.start) * 1000) / 1000).toString().padEnd(8, "0")}ms => ${cached.data.method}`,
                                )
                                requestIdMap.delete(parsed.id)
                            }

                            waitForCondition(() => appClient.readyState === WebSocket.OPEN, 1000, 100)
                                .then(() => appClient.send(msg.data))
                                .catch(() => {
                                    this.logger?.error(
                                        "Proxy WS Client is not yet open, cannot forward responses from the Anvil WS Client",
                                    )
                                })
                        })

                        anvilClient.addEventListener("close", () => appClient.close())
                    },
                }
            }),
        )
    }

    #getNextBehavior(method: string): ProxyBehavior {
        if (this.mode === ProxyMode.Random && this.randomProbs) {
            const random = Math.random()

            if (random < this.randomProbs[ProxyBehavior.NotAnswer]) {
                return ProxyBehavior.NotAnswer
            }
            if (random < this.randomProbs[ProxyBehavior.Fail]) {
                return ProxyBehavior.Fail
            }
        }

        if (this.mode === ProxyMode.Deterministic && method === "eth_sendRawTransaction") {
            return this.nextBehaviors.shift() ?? ProxyBehavior.Forward
        }

        return ProxyBehavior.Forward
    }

    #setupHttpProxy() {
        this.app.post("*", async (c) => {
            const body = await c.req.json()
            const response = this.#getNextBehavior(body.method)

            if (response === ProxyBehavior.NotAnswer) return
            if (response === ProxyBehavior.Fail) return c.json({ error: "Proxy error" }, 500)

            // ProxyBehavior.forward
            const reqUrl = new URL(c.req.url)
            const targetUrl = new URL(reqUrl.pathname + reqUrl.search, this.upstreamHttpUrl)

            try {
                const start = performance.now()
                const response = await fetch(targetUrl.toString(), {
                    method: c.req.method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                })
                const data = await response.json()
                this.logger?.trace(
                    `(http) ${(Math.round((performance.now() - start) * 1000) / 1000).toString().padEnd(8, "0")}ms => ${body.method}`,
                )

                return c.json(data, response.status as ContentfulStatusCode)
            } catch (error) {
                return c.json({ error: `Proxy error: ${stringify(error)}` }, 500)
            }
        })
    }
}
