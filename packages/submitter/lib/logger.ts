import { Logger, logLevel } from "@happy.tech/common"
import { env } from "./env"

export const logger = Logger.create("Submitter", logLevel(env.LOG_LEVEL))
