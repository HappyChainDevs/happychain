import { env } from "./env"
import { app } from "./server"
import type { AppType } from "./server"

export type { AppType }

export default {
    port: env.APP_PORT,
    fetch: app.fetch,
}