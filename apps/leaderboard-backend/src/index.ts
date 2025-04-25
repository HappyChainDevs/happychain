import { app } from "./server"

const port = Number(process.env.PORT) || 4545

export default {
    port,
    fetch: app.fetch,
}
