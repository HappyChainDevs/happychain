import { Hono } from "hono"
import { every, except } from "hono/combine"
import { logger } from "hono/logger"
import { prettyJSON } from "hono/pretty-json"
import { requestId } from "hono/request-id"
import { timeout } from "hono/timeout"
import { timing } from "hono/timing"
import env from "./env"
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
                timing(), // measure response times
                logger(), // log all calls to the console
                prettyJSON(), // add '?pretty' to any json endpoint to prettyprint
            ),
        ),
    )
    .use(timeout(10_000))
    .use(requestId())

    // routes
    .route("/api/v1/submitter", submitterApi)
    .route("/api/v1/accounts", accountsApi)

app.notFound((c) => c.text("These aren't the droids you're looking for", 404))
app.onError((err, c) => {
    console.error(`${err}`)
    return c.text(`${err}`, 500)
})

// Enable API Documentation page
initOpenAPI(app)

export type AppType = typeof app
