import { Hono } from "hono"
import { openAPISpecs } from "hono-openapi"
import { HTTPException } from "hono/http-exception"
import { requestId as requestIdMiddleware } from "hono/request-id"
import { ZodError } from "zod"
import { env } from "#lib/env"
import { isProduction } from "#lib/utils/isProduction"
import { logger } from "#lib/utils/logger"
import pkg from "../../package.json" assert { type: "json" }
import accountsApi from "./accountRoute"
import boopApi from "./boopRoute"

const app = new Hono() //
    .use(async (c, next) => {
        await next()
        // TODO don't await json here if not tracing
        logger.trace("sending response", c.res.status, await c.res.clone().json())
    })
    .use(requestIdMiddleware())
    .route("/api/v1/accounts", accountsApi)
    .route("/api/v1/boop", boopApi)

// Don't chain these to simplify AppType
app.notFound((c) => c.text("These aren't the droids you're looking for", 404))
app.onError(async (err, c) => {
    // re-format input validation errors
    if (err instanceof HTTPException && err.cause instanceof ZodError) {
        const error = err.cause.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
        return c.json({ error, requestId: c.get("requestId"), url: c.req.url }, 422)
    }

    //
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
