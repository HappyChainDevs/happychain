import "zod-openapi/extend"
import { apiReference } from "@scalar/hono-api-reference"
import { Hono } from "hono"
import { openAPISpecs } from "hono-openapi"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"
import { logger as loggerMiddleware } from "hono/logger"
import { prettyJSON as prettyJSONMiddleware } from "hono/pretty-json"
import { requestId as requestIdMiddleware } from "hono/request-id"
import { timeout as timeoutMiddleware } from "hono/timeout"
import { timing as timingMiddleware } from "hono/timing"
import { ZodError } from "zod"
import pkg from "../../package.json" assert { type: "json" }
import { env } from "../env"
import { isProduction } from "../utils/isProduction"
import { logJSONResponseMiddleware, logger } from "../utils/logger"
import configRoute from "./configRoute"

const app = new Hono()

// Middleware setup
app.use(
    "*",
    cors({
        origin: "*",
    }),
)
app.use("*", timingMiddleware())
// app.use("*", loggerMiddleware())
// app.use("*", logJSONResponseMiddleware)
// app.use("*", prettyJSONMiddleware())
app.use("*", timeoutMiddleware(30_000))
app.use("*", requestIdMiddleware())

// Routes setup
app.get("/", (c) => c.text("Welcome to the Settings Service!"))

// OpenAPI documentation
app.get(
    "/docs/openapi.json",
    openAPISpecs(app, {
        documentation: {
            info: { title: "Settings", version: pkg.version, description: "Settings API" },
            servers: [
                ...(env.NODE_ENV === "development"
                    ? [
                          {
                              url: `http://localhost:${env.APP_PORT}`,
                              description: "Local",
                          },
                      ]
                    : []),
                { url: "https://settings.testnet.happy.tech", description: "Testnet" },
            ],
        },
    }),
)

// API Reference UI
app.get(
    "/docs",
    apiReference({
        pageTitle: "Settings API Reference - HappyChain",
        theme: "kepler",
        spec: { url: "/docs/openapi.json" },
        showSidebar: true,
        hideSearch: false,
    }),
)

app.notFound((c) => c.text("These aren't the droids you're looking for", 404))
app.onError(async (err, c) => {
    // re-format input validation errors
    if (err instanceof HTTPException && err.cause instanceof ZodError) {
        const error = err.cause.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
        return c.json({ error, requestId: c.get("requestId"), url: c.req.url }, 422)
    }

    logger.warn({ requestId: c.get("requestId"), url: c.req.url }, err)

    // standard hono exceptions
    // https://hono.dev/docs/api/exception#handling-httpexception
    if (err instanceof HTTPException) return err.getResponse()

    // Unhandled Exceptions - should not occur
    return c.json(
        {
            error: isProduction
                ? `Something Happened, file a report with this key to find out more: ${c.get("requestId")}`
                : err.message,
            requestId: c.get("requestId"),
            url: c.req.url,
        },
        500,
    )
})

app.route("/api/v1/settings", configRoute)

export type AppType = typeof app
export { app }
