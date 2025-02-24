import express from "express"
import { ANVIL_PORT, PROXY_PORT } from "./constants"

export enum ProxyBehavior {
    Forward = "Forward",
    NotAnswer = "NotAnswer",
}

export class ProxyServer {
    private app: express.Application
    private nextBehaviors: ProxyBehavior[]

    constructor() {
        this.app = express()
        this.app.use(express.json())
        this.nextBehaviors = []
    }

    public addBehavior(behavior: ProxyBehavior) {
        this.nextBehaviors.push(behavior)
    }

    public async start() {
        this.app.post("*", async (req, res) => {
            if (req.body.method === "eth_sendRawTransaction") {
                const behavior = this.nextBehaviors.shift() ?? ProxyBehavior.Forward
                if (behavior === ProxyBehavior.NotAnswer) {
                    return
                }
            }

            const targetUrl = new URL(req.originalUrl, `http://localhost:${ANVIL_PORT}`)
            try {
                const response = await fetch(targetUrl.toString(), {
                    method: req.method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(req.body),
                })
                const data = await response.json()
                res.status(response.status).json(data)
            } catch (_) {
                res.status(500).json({ error: "Proxy error" })
            }
        })

        this.app.listen(PROXY_PORT)
    }
}
