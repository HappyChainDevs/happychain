import env from "./env"
import { app } from "./server"

export default {
    port: env.APP_PORT,
    fetch: app.fetch,
}
