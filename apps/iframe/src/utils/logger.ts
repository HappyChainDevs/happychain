import { LogLevel, Logger, logLevel } from "@happy.tech/common"

/**
 * Default at which all logger's log level are set by default if not changed programmatically.
 * Initialized to the env var VITE_LOG_LEVEL if set, otherwise {@link LogLevel.WARN}.
 */
const defaultLogLevel = logLevel(import.meta.env.VITE_LOG_LEVEL)
Logger.instance.setLogLevel(defaultLogLevel)

/**
 * Default logger instance. Also accessible in the browser console via `window.happyLogger`.
 */
export const logger = Logger.instance

/**
 * Logger facade for tracing requests.
 */
export const reqLogger = Logger.create("Requests")

/**
 * Logger facade for Session Keys
 */
export const sessionKeyLogger = Logger.create("SessionKeys", LogLevel.TRACE)
