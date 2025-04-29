import { type AppType, app } from "./server"

const port = Number(process.env.PORT) || 4545

export type { AppType }

export default {
    port,
    fetch: app.fetch,
}
