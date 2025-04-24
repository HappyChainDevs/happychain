import { serve } from "@hono/node-server"
import { apiReference } from "@scalar/hono-api-reference"
import { Hono } from "hono"
import { openAPISpecs } from "hono-openapi"
import { cors } from "hono/cors"
import { logger as loggerMiddleware } from "hono/logger"
import { prettyJSON as prettyJSONMiddleware } from "hono/pretty-json"
import { requestId as requestIdMiddleware } from "hono/request-id"
import { timeout as timeoutMiddleware } from "hono/timeout"
import { timing as timingMiddleware } from "hono/timing"
import pkg from "../package.json" assert { type: "json" }
import { env } from "./env"
import { FaucetUsageRepository } from "./faucet-usage.repository"
import { setupFaucetRoutes } from "./faucet.route"
import { CloudflareService } from "./services/cloudflare"
import { FaucetService } from "./services/faucet"

export class Server {
    private app: Hono
    private faucetService: FaucetService
    private cloudflareService: CloudflareService
    private faucetUsageRepository: FaucetUsageRepository

    constructor() {
        this.app = new Hono()
        this.faucetUsageRepository = new FaucetUsageRepository()
        this.faucetService = new FaucetService(this.faucetUsageRepository)
        this.cloudflareService = new CloudflareService(env.TURNSTILE_SECRET)
    }


    async start() {
        this.app.use(
            "*",
            cors({
                origin: env.CORS_ORIGIN,
            }),
        )
        this.app.use("*", timingMiddleware())
        this.app.use("*", loggerMiddleware())
        this.app.use("*", prettyJSONMiddleware())
        this.app.use("*", timeoutMiddleware(30_000))
        this.app.use("*", requestIdMiddleware())

        await this.faucetService.start()

        this.setupRoutes()

        serve({ fetch: this.app.fetch, port: env.APP_PORT })
    }

    private setupRoutes() {
        this.app.get("/", (c) => c.text("Welcome to the Faucet Service!"))

        setupFaucetRoutes(this.app, this.faucetService, this.cloudflareService)

        // OpenAPI documentation
        this.app.get(
            "/docs/openapi.json",
            openAPISpecs(this.app, {
                documentation: {
                    info: { title: "Faucet", version: pkg.version, description: "Faucet API" },
                    servers: [
                        env.NODE_ENV === "development" && {
                            url: `http://localhost:${env.APP_PORT}`,
                            description: "Local",
                        },
                        { url: "https://faucet.testnet.happy.tech", description: "Testnet" },
                    ].filter(Boolean),
                },
            }),
        )

        // API Reference UI
        this.app.get(
            "/docs",
            apiReference({
                pageTitle: "Faucet API Reference - HappyChain",
                theme: "kepler",
                spec: { url: "/docs/openapi.json" },
                showSidebar: true,
                hideSearch: false,
            }),
        )
    }

}
