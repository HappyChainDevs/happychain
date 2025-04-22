import { LogLevel, Logger } from "@happy.tech/common"
import { env } from "./env"

const logLevel: LogLevel =
    env.NODE_ENV === "test"
        ? LogLevel.WARN
        : {
              off: LogLevel.OFF,
              trace: LogLevel.TRACE,
              info: LogLevel.INFO,
              warn: LogLevel.WARN,
              error: LogLevel.ERROR,
          }[env.LOG_LEVEL]

export const logger = Logger.create("Submitter", logLevel)
