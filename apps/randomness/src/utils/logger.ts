import { Logger } from "@happy.tech/common"
import { env } from "../env"
export const logger = Logger.create("Random", { colors: env.LOG_COLORS, timestamp: env.LOG_TIMESTAMPS })
