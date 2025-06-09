import { Logger } from "@happy.tech/common"
import { env } from "../env"
export const logger = Logger.create("RandomnessMonitor", { colors: env.LOG_COLORS, timestamp: env.LOG_TIMESTAMPS })
