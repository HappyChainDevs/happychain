import { apiReference } from "@scalar/hono-api-reference"
import { Hono } from "hono"
import { openAPISpecs } from "hono-openapi"
import { bodyLimit } from "hono/body-limit"
import { every, except } from "hono/combine"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"
import { logger as loggerMiddleware } from "hono/logger"
import { prettyJSON as prettyJSONMiddleware } from "hono/pretty-json"
import { requestId as requestIdMiddleware } from "hono/request-id"
import { timeout as timeoutMiddleware } from "hono/timeout"
import { timing as timingMiddleware } from "hono/timing"
import { env, isProduction } from "#lib/env"
import { instrumentHttpMiddleware } from "#lib/telemetry/traces"
import { logJSONResponseMiddleware, logger } from "#lib/utils/logger"
import pkg from "../../package.json" assert { type: "json" }
import accountsApi from "./accountRoute"
import boopApi from "./boopRoute"

// Create the app but don't configure routes yet - we'll do that after resync
const app = new Hono()
    .use(
        bodyLimit({
            maxSize: 100 * 1024, // 100 KiB, enough for a boop with a large payload
            onError: (c) => c.json({ error: "Request body too large (max 100kb)" }, 413),
        }),
    )
    .use(instrumentHttpMiddleware)
    .use(
        "*",
        cors({
            origin: "*",
            allowMethods: ["GET", "POST", "OPTIONS"],
            allowHeaders: ["Content-Type"],
            maxAge: 86400, // max allowable age for cached preflight requests (some browsers will downgrade this)
        }),
    )
    .use(logJSONResponseMiddleware)
    .use(
        except(
            // don't run these during testing
            () => env.NODE_ENV === "test",
            every(
                timingMiddleware(), // measure response times
                loggerMiddleware(), // log all calls to the console
                prettyJSONMiddleware(), // add '?pretty' to any json endpoint to prettyprint
            ),
        ),
    )
    .use(timeoutMiddleware(30_000))
    .use(requestIdMiddleware())
    .route("/api/v1/accounts", accountsApi)
    .route("/api/v1/boop", boopApi)

// === Don't chain below here to simplify AppType ===

// Landing Page
app.get("/", (c) =>
    c.html(
        `Greetings from Happychain. 
    Visit the <a href='https://docs.happy.tech'>Happy Docs</a> for more information, 
    or the <a href='/docs'>Open API Spec</a>`,
    ),
)
// Adds Scalar UI for API docs
app.get(
    "/docs",
    // https://github.com/scalar/scalar/blob/main/documentation/configuration.md
    apiReference({
        pageTitle: "Boop Submitter API Reference - HappyChain",
        theme: "kepler",
        spec: { url: "/docs/openapi.json" },
        showSidebar: true,
        hideSearch: false,
    }),
)

app.notFound((c) => c.text("These aren't the droids you're looking for", 404))
app.onError(async (err, c) => {
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
app.get(
    "docs/openapi.json",
    openAPISpecs(app, {
        documentation: {
            info: {
                title: "Boop",
                version: pkg.version,
                description: "Boop Submitter",
            },
            servers: [
                env.NODE_ENV === "development" && {
                    url: `http://localhost:${env.APP_PORT}`,
                    description: "Local server",
                },
                env.NODE_ENV === "staging" && {
                    url: "https://submitter-staging.happy.tech",
                    description: "Staging server",
                },
                { url: "https://submitter.happy.tech", description: "Production server" },
            ].filter(Boolean) as { url: string; description: string }[],
        },
    }),
)
export type AppType = typeof app
export { app }
