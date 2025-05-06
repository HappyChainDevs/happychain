import { Logger, logLevel } from "@happy.tech/common"
import { env } from "../env"

Logger.instance.setLogLevel(logLevel(env.LOG_LEVEL))

export const logger = Logger.create("Submitter")
