import { Scalar } from "@scalar/hono-api-reference"
import { Hono } from "hono"
import { openAPISpecs } from "hono-openapi"
import { every } from "hono/combine"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"
import { logger as loggerMiddleware } from "hono/logger"
import { prettyJSON as prettyJSONMiddleware } from "hono/pretty-json"
import { requestId as requestIdMiddleware } from "hono/request-id"
import { timeout as timeoutMiddleware } from "hono/timeout"
import { timing as timingMiddleware } from "hono/timing"
import { ZodError } from "zod"
import { type Repositories, repositories } from "./repositories"
import gamesApi from "./routes/api/gamesRoutes"
import guildsApi from "./routes/api/guildsRoutes"
import leaderboardApi from "./routes/api/leaderboardRoutes"
import usersApi from "./routes/api/usersRoutes"

declare module "hono" {
    interface ContextVariableMap {
        repos: Repositories
    }
}

const app = new Hono()
    .use(requestIdMiddleware())
    .use(cors())
    .use("*", async (c, next) => {
        c.set("repos", repositories)
        await next()
    })
    .use(
        every(
            timingMiddleware(), // measure response times
            loggerMiddleware(), // log all calls to the console
            prettyJSONMiddleware(), // add '?pretty' to any json endpoint to prettyprint
        ),
    )
    .use(timeoutMiddleware(5000))
    // Landing Page
    .get("/", (c) =>
        c.html(
            `<h1>Leaderboard API</h1>
        <p>Visit the <a href="https://docs.happy.tech">Happy Docs</a> for more information, or the <a href="/docs">Open API Spec</a></p>`,
        ),
    )
    .route("/users", usersApi)
    .route("/guilds", guildsApi)
    .route("/games", gamesApi)
    .route("/leaderboards", leaderboardApi)

// Serve OpenAPI JSON at /docs/openapi.json
app.get(
    "/docs/openapi.json",
    openAPISpecs(app, {
        documentation: {
            info: {
                title: "Leaderboard API",
                version: "0.1.0",
                description: "Leaderboard backend for HappyChain",
            },
            servers: [
                {
                    url: `http://localhost:${process.env.PORT || 4545}`,
                    description: "Local server",
                },
            ],
        },
    }),
)

// Adds Scalar UI for API docs
app.get(
    "/docs",
    // https://github.com/scalar/scalar/blob/main/documentation/configuration.md
    Scalar({
        pageTitle: "Leaderboard API Reference - HappyChain",
        theme: "kepler",
        url: "/docs/openapi.json",
        showSidebar: true,
        hideSearch: false,
    }),
)

app.notFound((c) => c.json({ message: "Not Found", ok: false, requestId: c.get("requestId"), url: c.req.url }, 404))
app.onError(async (err, c) => {
    if (err instanceof HTTPException && err.cause instanceof ZodError) {
        const error = err.cause.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
        return c.json({ error, requestId: c.get("requestId"), url: c.req.url }, 422)
    }
    if (err instanceof HTTPException) return err.getResponse()
    return c.json(
        {
            error: err.message,
            requestId: c.get("requestId"),
            url: c.req.url,
        },
        500,
    )
})

export type AppType = typeof app
export { app }
