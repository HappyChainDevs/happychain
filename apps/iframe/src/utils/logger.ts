// biome-ignore lint/correctness/noUnusedImports: LogLevel is left in for docs link
import { LogLevel, Logger, logLevel } from "@happy.tech/common"

/**
 * Default at which all logger's log level are set by default if not changed programmatically.
 * Initialized to the env var VITE_LOG_LEVEL if set, otherwise {@link LogLevel.WARN}.
 */
export const defaultLogLevel = logLevel(import.meta.env.VITE_LOG_LEVEL)
Logger.instance.setLogLevel(defaultLogLevel)

/** Default logger instance. Also accessible in the browser console via `window.happyLogger`. */
export const logger = Logger.instance

/** Logger facade for "back-end" request handling (i.e. not used in the request popups). */
export const reqLogger = Logger.create("Requests", { level: defaultLogLevel })

/** Logger facade for session key logic. */
export const sessionKeyLogger = Logger.create("SessionKeys", { level: defaultLogLevel })

/** Logger facade for permission logic. */
export const permissionsLogger = Logger.create("Permissions", { level: defaultLogLevel })
