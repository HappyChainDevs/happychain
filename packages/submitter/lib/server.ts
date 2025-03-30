import { Hono } from "hono"
import { every, except } from "hono/combine"
import { HTTPException } from "hono/http-exception"
import { logger as loggerMiddleware } from "hono/logger"
import { prettyJSON as prettyJSONMiddleware } from "hono/pretty-json"
import { requestId as requestIdMiddleware } from "hono/request-id"
import { timeout as timeoutMiddleware } from "hono/timeout"
import { timing as timingMiddleware } from "hono/timing"
import { ZodError } from "zod"
import env from "./env"
import { HappyBaseError } from "./errors"
import { logger } from "./logger"
import accountsApi from "./routes/api/accounts"
import submitterApi from "./routes/api/submitter"

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

// TODO this looks like it can return quite a colorful array of variously formatted error messages, can't we normalize?
app.onError(async (err, c) => {
    if (err instanceof HTTPException && err.cause instanceof ZodError) {
        const error = err.cause.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
        logger.warn(error)
        return c.json({ error }, 422)
    }

    logger.warn({ requestId: c.get("requestId"), url: c.req.url }, err)

    if (err instanceof HTTPException) return err.getResponse()
    if (err instanceof HappyBaseError) return c.json(err.getResponseData(), 422)

    const response =
        env.NODE_ENV === "production"
            ? {
                  // TODO why not? is this about avoiding to leak sensitive info (can only thing of keys for this?)
                  // don't include raw error in prod
                  message: `Something Happened, file a report with this key to find out more: ${c.get("requestId")}`,
                  url: c.req.url,
                  requestId: c.get("requestId"),
              }
            : {
                  requestId: c.get("requestId"),
                  url: c.req.url,
                  error: err.message,
              }

    return c.json(response, 500)
})

export type AppType = typeof app
