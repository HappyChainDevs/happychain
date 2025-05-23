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
import { description, faucetHandler, validation } from "./faucet.route"
import { faucetService } from "./services/faucet"

const app = new Hono()

// Middleware setup
app.use(
    "*",
    cors({
        origin: "*",
    }),
)
app.use("*", timingMiddleware())
app.use("*", loggerMiddleware())
app.use("*", prettyJSONMiddleware())
app.use("*", timeoutMiddleware(30_000))
app.use("*", requestIdMiddleware())

// Routes setup
app.get("/", (c) => c.text("Welcome to the Faucet Service!"))

// Faucet route
app.post("/faucet", validation, description, faucetHandler)

// OpenAPI documentation
app.get(
    "/docs/openapi.json",
    openAPISpecs(app, {
        documentation: {
            info: { title: "Faucet", version: pkg.version, description: "Faucet API" },
            servers: [
                ...(env.NODE_ENV === "development"
                    ? [
                          {
                              url: `http://localhost:${env.FAUCET_PORT}`,
                              description: "Local",
                          },
                      ]
                    : []),
                { url: "https://faucet.testnet.happy.tech", description: "Testnet" },
            ],
        },
    }),
)

// API Reference UI
app.get(
    "/docs",
    apiReference({
        pageTitle: "Faucet API Reference - HappyChain",
        theme: "kepler",
        spec: { url: "/docs/openapi.json" },
        showSidebar: true,
        hideSearch: false,
    }),
)

export async function startServer() {
    await faucetService.start()
    serve({ fetch: app.fetch, port: env.FAUCET_PORT })
}

startServer()
