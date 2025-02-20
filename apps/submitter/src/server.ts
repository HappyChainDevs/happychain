import { Hono } from "hono"
import { every, except } from "hono/combine"
import { logger as loggerMiddleware } from "hono/logger"
import { prettyJSON as prettyJSONMiddleware } from "hono/pretty-json"
import { requestId as requestIdMiddleware } from "hono/request-id"
import { timeout as timeoutMiddleware } from "hono/timeout"
import { timing as timingMiddleware } from "hono/timing"
import env from "./env"
import { parseFromViemError } from "./errors/utils"
import { logger } from "./logger"
import accountsApi from "./routes/api/accounts"
import submitterApi from "./routes/api/submitter"
import { initOpenAPI } from "./routes/docs"

export const app = new Hono()
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
    .use(timeoutMiddleware(10_000))
    .use(requestIdMiddleware())

    // routes
    .route("/api/v1/submitter", submitterApi)
    .route("/api/v1/accounts", accountsApi)

app.notFound((c) => c.text("These aren't the droids you're looking for", 404))
app.onError((err, c) => {
    logger.warn({ requestId: c.get("requestId"), url: c.req.url }, err)

    if ("getResponseData" in err && typeof err.getResponseData === "function") return c.json(err.getResponseData(), 500)

    // Try to parse raw viem error, or fallback to unknown
    const fallback = parseFromViemError(err)?.getResponseData()
    if (fallback) return c.json(fallback, 500)

    return c.json(
        {
            message: `Something Happened, file a report with this key to find out more: ${c.get("requestId")}`,
            requestId: c.get("requestId"),
        },
        500,
    )
})

// Enable API Documentation page
initOpenAPI(app)

export type AppType = typeof app
