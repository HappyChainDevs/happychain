import { LogLevel, Logger } from "@happy.tech/common"
import { env } from "./env"
export const logger = Logger.create("MonitorService", {
    level: LogLevel.INFO,
    colors: env.LOG_COLORS,
    timestamp: env.LOG_TIMESTAMPS,
})
