import "./telemetry/instrumentation"

import { env } from "./env"
import { app } from "./server"

// Bun will run the server using these parameters.
export default {
    port: env.APP_PORT,
    fetch: app.fetch,
}
