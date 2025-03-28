import { app, env } from "@happy.tech/submitter"
import { apiReference } from "@scalar/hono-api-reference"

// Adds Scalar UI for API docs
app.get(
    "/docs",
    // https://github.com/scalar/scalar/blob/main/documentation/configuration.md
    apiReference({
        pageTitle: "Boop API Reference - HappyChain",
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
