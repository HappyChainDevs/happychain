import { Hono } from "hono"
import { openAPISpecs } from "hono-openapi"
import { every, except } from "hono/combine"
import { HTTPException } from "hono/http-exception"
import { logger as loggerMiddleware } from "hono/logger"
import { prettyJSON as prettyJSONMiddleware } from "hono/pretty-json"
import { requestId as requestIdMiddleware } from "hono/request-id"
import { timeout as timeoutMiddleware } from "hono/timeout"
import { timing as timingMiddleware } from "hono/timing"
import { ZodError } from "zod"
import pkg from "../package.json" assert { type: "json" }
import { env } from "./env"
import { logger } from "./logger"
import accountsApi from "./routes/api/accounts"
import submitterApi from "./routes/api/submitter"
import { isProduction } from "./utils/isProduction"

const app = new Hono()
    // middleware
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

    // Routes
    .get("/", (c) =>
        c.html(
            `Greetings from Happychain. 
            Visit the <a href='https://docs.happy.tech'>Happy Docs</a> for more information, 
            or the <a href='/docs'>Open API Spec</a>`,
        ),
    )
    .route("/api/v1/accounts", accountsApi)
    .route("/api/v1/submitter", submitterApi)

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
            ],
        },
    }),
)
export type AppType = typeof app
export { app }
