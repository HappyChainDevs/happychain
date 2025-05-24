import { env } from "./env"
import { type AppType, app } from "./server"

export type { AppType }

export default {
    port: Number(env.PORT) || 4545,
    fetch: app.fetch,
}
