import { LogLevel, Logger, logLevel } from "@happy.tech/common"
import { env } from "./env"

export const logger = Logger.create("Submitter", env.NODE_ENV === "test" ? LogLevel.WARN : logLevel(env.NODE_ENV))
