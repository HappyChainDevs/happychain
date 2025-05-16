import { LogLevel, Logger, logLevel } from "@happy.tech/common"
import { createMiddleware } from "hono/factory"
import { env } from "../env"

const defaultLogLevel = logLevel(env.LOG_LEVEL)
Logger.instance.setLogLevel(defaultLogLevel)

export const logger = Logger.create("SettingsService")

const responseLogger = Logger.create("Response", LogLevel.TRACE)
export const logJSONResponseMiddleware = createMiddleware(async (c, next) => {
    await next()

    if (LogLevel.TRACE > responseLogger.logLevel) return
    if (!c.req.path.startsWith("/api")) return
    try {
        responseLogger.trace(c.res.status, await c.res.clone().json())
    } catch (e) {
        responseLogger.error("failed to parse response:", {
            error: (e as Error)?.message,
            requestId: c.get("requestId"),
            url: c.req.url,
        })
    }
})
