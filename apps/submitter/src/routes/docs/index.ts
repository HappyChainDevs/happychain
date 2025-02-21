import { apiReference } from "@scalar/hono-api-reference"
import type { Hono } from "hono"
import { openAPISpecs } from "hono-openapi"
import pkg from "../../../package.json"

const openAPIConfig = {
    documentation: {
        info: {
            title: "Boop",
            version: pkg.version,
            description: "Happy Account Submitter",
        },
        servers: [
            {
                url: "http://localhost:3001",
                description: "Local server",
            },
            {
                url: "https://boop.happy.tech",
                description: "Local server",
            },
        ],
    },
}

/**
 * Initialize the Scalar OpenAPI page. This needs to apply to the root 'app'
 * in order to have access to all available routes. Hence passing 'app' in,
 * instead of creating a new Hono Router here.
 */
export function initOpenAPI<TApp extends Hono>(app: TApp): void {
    app.get("/docs", apiReference({ theme: "saturn", spec: { url: "/docs/openapi.json" } }))
    app.get("/docs/openapi.json", openAPISpecs(app, openAPIConfig))
}
