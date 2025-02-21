import { Hono } from "hono"
import { every, except } from "hono/combine"
import { logger as loggerMiddleware } from "hono/logger"
import { prettyJSON as prettyJSONMiddleware } from "hono/pretty-json"
import { requestId as requestIdMiddleware } from "hono/request-id"
import { timeout as timeoutMiddleware } from "hono/timeout"
import { timing as timingMiddleware } from "hono/timing"
import env from "./env"
import { logger } from "./logger"
import accountsApi from "./routes/api/accounts"
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

    // Routes
    .route("/api/v1/accounts", accountsApi)

app.notFound((c) => c.text("These aren't the droids you're looking for", 404))
app.onError((err, c) => {
    logger.warn(err)
    return c.json({ message: "Something Happened" }, 500)
})

// Enable API Documentation page
initOpenAPI(app)

export type AppType = typeof app
