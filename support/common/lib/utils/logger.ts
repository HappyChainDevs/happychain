/**
 * Defines the allowed log levels.
 *
 * OFF:    No logs are printed.
 * ERROR:  Error messages only.
 * WARN:   Warnings and above (WARN, ERROR).
 * INFO:   Info and above (INFO, WARN, ERROR).
 * TRACE:  All messages (TRACE, INFO, WARN, ERROR).
 */
export enum LogLevel {
    OFF = -1,
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    TRACE = 3,
}

/**
 * Tags that categorize log messages by subsystem or feature area.
 */
export enum LogTag {
    IFRAME = "iFrame",
    DEMO_REACT = "demo-react",
}

/**
 * Singleton Logger
 *
 * Provides four logging methods (error, warn, info, trace),
 * each of which can be selectively enabled or disabled
 * based on two factors:
 * 1) The global log level (OFF, ERROR, WARN, INFO, TRACE).
 * 2) A set of "enabled" tags that filter messages by subsystem.
 * Example usage:
 *  const logger = Logger.instance;
 *  logger.info(LogTag.IFRAME, 'User logged in.'); // prints "[INFO] [iFrame] User logged in."
 *  logger.setLogLevel(LogLevel.INFO); // Now only INFO and above will print.
 *  logger.enableTags(LogTag.DEMO_REACT); // Now only messages with the DEMO_REACT tag will print.
 */
export class Logger {
    /**
     * Holds the single instance of the logger.
     */
    private static _instance: Logger

    /**
     * By default, set to LogLevel.OFF so that no logs are printed.
     */
    private minLevel: LogLevel = LogLevel.OFF

    /**
     * A collection of tags for which logs are allowed.
     * Only logs containing at least one enabled tag will be printed,
     * provided they also meet the minLevel criteria.
     */
    private enabledTags: Set<string> = new Set()

    /**
     * Private constructor to enforce singleton usage.
     */
    private constructor() {}

    /**
     * Retrieves the singleton instance of the Logger.
     */
    public static get instance(): Logger {
        if (!Logger._instance) {
            Logger._instance = new Logger()
        }
        return Logger._instance
    }

    /**
     * Sets the minimum log level.
     *
     * @param level The desired minimum log level (OFF, ERROR, WARN, INFO, TRACE).
     *              A message is only logged if:
     *              (a) its severity is <= minLevel, and
     *              (b) it has at least one enabled tag.
     */
    public setLogLevel(level: LogLevel): void {
        this.minLevel = level
    }

    /**
     * Enables one or more tags for logging.
     *
     * Only messages that include at least one "enabled" tag will be considered
     * for printing. All other tags/messages are filtered out.
     *
     * @param tags A list of tags (strings or LogTag enum values).
     *             Example: enableTags(LogTag.SYSTEM, LogTag.NETWORK)
     */
    public enableTags(...tags: (string | LogTag)[]): void {
        for (const tag of tags) {
            this.enabledTags.add(tag)
        }
    }

    /**
     * Disables (removes) one or more tags from the "enabled" set.
     *
     * @param tags A list of tags to remove. After calling this,
     *             any future log that only has the removed tags
     *             will be filtered out.
     */
    public disableTags(...tags: (string | LogTag)[]): void {
        for (const tag of tags) {
            this.enabledTags.delete(tag)
        }
    }

    /**
     * Clears all enabled tags.
     *
     * After this, no logs will be printed unless new tags are re-enabled.
     */
    public clearAllTags(): void {
        this.enabledTags.clear()
    }

    /**
     * Internal helper to decide if a message meets the level + tag criteria.
     *
     * @param level      The log level (ERROR, WARN, INFO, or TRACE).
     * @param inputTags  The tags associated with the log call.
     * @returns true if the log should be printed, false otherwise.
     */
    private shouldLog(level: LogLevel, inputTags: string[]): boolean {
        // If the level is above the minLevel (higher numeric value => less important),
        // we skip logging. For example, if minLevel=ERROR, then WARN/INFO/TRACE won't show.
        if (level > this.minLevel) {
            return false
        }
        // If no tags are enabled, skip everything.
        if (this.enabledTags.size === 0) {
            return false
        }
        // Check if any of the log's tags is in the enabled set.
        return inputTags.some((tag) => this.enabledTags.has(tag))
    }

    /**
     * Logs a message at the ERROR level.
     *
     * @param tagOrTags One or more tags describing the subsystem(s)
     * @param args      Additional data to print
     */
    public error(tagOrTags: LogTag | LogTag[], ...args: unknown[]): void {
        const tags = Array.isArray(tagOrTags) ? tagOrTags : [tagOrTags]
        if (this.shouldLog(LogLevel.ERROR, tags)) {
            console.error("[ERROR]", `[${tags.join(", ")}]`, ...args)
        }
    }

    /**
     * Logs a message at the WARN level.
     *
     * @param tagOrTags One or more tags describing the subsystem(s)
     * @param args      Additional data to print
     */
    public warn(tagOrTags: LogTag | LogTag[], ...args: unknown[]): void {
        const tags = Array.isArray(tagOrTags) ? tagOrTags : [tagOrTags]
        if (this.shouldLog(LogLevel.WARN, tags)) {
            console.warn("[WARN]", `[${tags.join(", ")}]`, ...args)
        }
    }

    /**
     * Logs a message at the INFO level.
     *
     * @param tagOrTags One or more tags describing the subsystem(s)
     * @param args      Additional data to print
     */
    public info(tagOrTags: LogTag | LogTag[], ...args: unknown[]): void {
        const tags = Array.isArray(tagOrTags) ? tagOrTags : [tagOrTags]
        if (this.shouldLog(LogLevel.INFO, tags)) {
            console.info("[INFO]", `[${tags.join(", ")}]`, ...args)
        }
    }

    /**
     * Logs a message at the TRACE level.
     *
     * @param tagOrTags One or more tags describing the subsystem(s)
     * @param args      Additional data to print
     */
    public trace(tagOrTags: LogTag | LogTag[], ...args: unknown[]): void {
        const tags = Array.isArray(tagOrTags) ? tagOrTags : [tagOrTags]
        if (this.shouldLog(LogLevel.TRACE, tags)) {
            console.trace("[TRACE]", `[${tags.join(", ")}]`, ...args)
        }
    }
}
