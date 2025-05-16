import { serve } from "@hono/node-server"
import { env } from "./env"
import { app } from "./server"
import type { AppType } from "./server"

export type { AppType }

serve({
    port: env.APP_PORT,
    fetch: app.fetch,
})
