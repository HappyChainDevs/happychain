import { LogLevel, LogTag, Logger } from "@happy.tech/common"
import env from "./env"

const logLevel: LogLevel = {
    off: LogLevel.OFF,
    trace: LogLevel.TRACE,
    info: LogLevel.INFO,
    warn: LogLevel.WARN,
    error: LogLevel.ERROR,
}[env.LOG_LEVEL]

const _logger = Logger.instance
_logger.enableTags(LogTag.SUBMITTER)
_logger.setLogLevel(logLevel)

export const logger: Logger = new Proxy(_logger, {
    get(target, prop, receiver) {
        if (typeof target[prop] === "function") {
            return (...args: any[]) => target[prop](LogTag.SUBMITTER, ...args)
        }
        return target[prop]
    },
})
