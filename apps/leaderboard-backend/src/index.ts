import { type AppType, app } from "./server"

export type { AppType }

export default {
    port: Number(process.env.PORT) || 4545,
    fetch: app.fetch,
}
