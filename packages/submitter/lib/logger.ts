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

export const logger = createLogger(LogTag.SUBMITTER, logLevel)

// TODO: move into common/logger package
type TaggedLogger = {
    [K in keyof Logger]: Logger[K] extends (tag: LogTag, ...args: infer P) => infer R ? (...args: P) => R : Logger[K]
}
function createLogger(tag: LogTag, logLevel: LogLevel): TaggedLogger {
    Logger.instance.enableTags(tag)
    Logger.instance.setLogLevel(logLevel)

    return new Proxy(Logger.instance, {
        get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver)
            if (typeof value === "function") {
                return (...args: unknown[]) => {
                    const method = value as (tag: LogTag, ...args: unknown[]) => unknown
                    return method.call(target, tag, ...args)
                }
            }
            return value
        },
    }) as TaggedLogger
}
