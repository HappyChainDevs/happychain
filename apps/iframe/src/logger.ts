import { Logger, logLevel } from "@happy.tech/common"

/**
 * Default at which all logger's log level are set by default if not changed programmatically.
 * Initialized to the env var VITE_LOG_LEVEL if set, otherwise {@link LogLevel.WARN}.
 */
export const defaultLogLevel = logLevel(import.meta.env.VITE_LOG_LEVEL)

/**
 * Default logger instance. Also accessible in the browser console via `window.happyLogger`.
 */
export const logger = Logger.instance
logger.setLogLevel(defaultLogLevel)

/**
 * Logger facade for tracing requests.
 */
export const reqLogger = Logger.create("requests")
