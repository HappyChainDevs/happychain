import { apiReference } from "@scalar/hono-api-reference"
import type { Hono } from "hono"
import { type OpenApiSpecsOptions, openAPISpecs } from "hono-openapi"

/**
 * Initialize the Scalar OpenAPI page. This needs to apply to the root 'app'
 * in order to have access to all available routes. Hence passing 'app' in,
 * instead of creating a new Hono Router here.
 */
export function injectOpenAPIDocs<TApp extends Hono>(
    app: TApp,
    config: OpenApiSpecsOptions,
    options: Partial<{ theme: Parameters<typeof apiReference>[0]["theme"]; url: string; jsonUrl: string }> = {},
): void {
    const { theme = "saturn", url = "/docs", jsonUrl = `${url}/openapi.json` } = options
    app.get(url, apiReference({ theme, spec: { url: jsonUrl } }))
    app.get(jsonUrl, openAPISpecs(app, config))
}
