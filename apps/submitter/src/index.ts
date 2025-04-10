import { env, app as submitter } from "@happy.tech/submitter"
import { apiReference } from "@scalar/hono-api-reference"
import { Hono } from "hono"
import { every, except } from "hono/combine"
import { cors } from "hono/cors"
import { logger as loggerMiddleware } from "hono/logger"
import { prettyJSON as prettyJSONMiddleware } from "hono/pretty-json"
import { timeout as timeoutMiddleware } from "hono/timeout"
import { timing as timingMiddleware } from "hono/timing"

const app = new Hono()
    .use("*", cors())
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

    // Landing Page
    .get("/", (c) =>
        c.html(
            `Greetings from Happychain. 
Visit the <a href='https://docs.happy.tech'>Happy Docs</a> for more information, 
or the <a href='/docs'>Open API Spec</a>`,
        ),
    )

    // Api Routes
    .route("/", submitter)

    // Adds Scalar UI for API docs
    .get(
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

export default {
    port: env.APP_PORT,
    fetch: app.fetch,
}
