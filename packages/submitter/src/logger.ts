import { LogLevel, LogTag, Logger } from "@happy.tech/common"
import env from "./env"

const logLevel: LogLevel =
    env.NODE_ENV === "test"
        ? LogLevel.OFF
        : {
              off: LogLevel.OFF,
              trace: LogLevel.TRACE,
              info: LogLevel.INFO,
              warn: LogLevel.WARN,
              error: LogLevel.ERROR,
          }[env.LOG_LEVEL]

const _logger = Logger.instance
_logger.enableTags(LogTag.SUBMITTER)
_logger.setLogLevel(logLevel)

// Create a type that omits the LogTag parameter from logger methods
type SubmitterLogger = {
    [K in keyof Logger]: Logger[K] extends (tag: LogTag.SUBMITTER, ...args: infer P) => infer R
        ? (...args: P) => R
        : Logger[K]
}

export const logger = new Proxy(_logger, {
    get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver)
        if (typeof value === "function") {
            return (...args: unknown[]) => {
                const method = value as (tag: LogTag, ...args: unknown[]) => unknown
                return method.call(target, LogTag.SUBMITTER, ...args)
            }
        }
        return value
    },
}) as SubmitterLogger
