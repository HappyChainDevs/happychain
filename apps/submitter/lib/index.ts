import { env } from "./env"
import { app } from "./server"
import type { AppType } from "./server"
import { initializeTelemetry } from "./telemetry/instrumentation"

export type { AppType }

initializeTelemetry()

export default {
    port: env.APP_PORT,
    fetch: app.fetch,
}
