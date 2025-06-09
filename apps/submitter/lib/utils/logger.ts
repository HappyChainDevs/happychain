import { LogLevel, Logger, getProp, ifDef, isEmpty, logLevel } from "@happy.tech/common"
import { createMiddleware } from "hono/factory"
import { env } from "#lib/env"
import type { Boop } from "#lib/types"
import { computeHash } from "#lib/utils/boop/computeHash"

const defaultLogLevel = logLevel(env.LOG_LEVEL)

Logger.instance.setSpanEventLogLevel(logLevel(env.SPAN_EVENT_LEVEL))

const defaultLoggerOptions = {
    colors: env.LOG_COLORS,
    timestamp: env.LOG_TIMESTAMPS,
    level: defaultLogLevel,
}

export const logger = Logger.create("Submitter", defaultLoggerOptions)
export const blockLogger = Logger.create("BlockService", defaultLoggerOptions)
export const receiptLogger = Logger.create("BoopReceiptService", defaultLoggerOptions)
export const resyncLogger = Logger.create("ResyncService", defaultLoggerOptions)
export const proxyLogger = Logger.create("proxyServer", defaultLoggerOptions)

// Don't trace unless enabled by dev, as this fills the logs quick.
blockLogger.setLogLevel(Math.min(LogLevel.INFO, defaultLogLevel))

export const logJSONResponseMiddleware = createMiddleware(async (c, next) => {
    await next()
    if (LogLevel.TRACE > logger.logLevel) return
    if (!c.req.path.startsWith("/api")) return
    try {
        const params = c.req.param()
        const input = !isEmpty(params) ? params : await c.req.json()
        const identifier =
            ifDef(getProp(input, "boop") as Boop, computeHash) ?? // Simulate, Submit, Execute
            getProp(input, "boopHash") ?? // GetState, WaitForReceipt
            getProp(input, "owner") ?? // CreateAccount
            getProp(input, "account") // GetPendingInput
        logger.trace("Response", c.req.routePath, identifier, c.res.status, await c.res.clone().json())
    } catch (e) {
        logger.error("Failed to parse response:", {
            error: (e as Error)?.message,
            requestId: c.get("requestId"),
            url: c.req.url,
        })
    }
})
