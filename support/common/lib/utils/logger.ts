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
    ALL = "All",
}

/**
 * Singleton Logger
 *
 * Provides four logging methods (error, warn, info, trace),
 * each of which can be selectively enabled or disabled
 * based on two factors:
 * 1) The global log level (OFF, ERROR, WARN, INFO, TRACE).
 * 2) A set of "enabled" tags that filter messages by subsystem. All enabled by default.
 * Example usage:
 *  const logger = Logger.instance;
 *  logger.info(LogTag.ALL, 'User logged in.'); // prints "[INFO] User logged in."
 *  logger.setLogLevel(LogLevel.INFO); // Now only INFO and above will print.
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
     * Set of enabled tags for filtering log messages.
     */
    private enabledTags: Set<LogTag> = new Set()

    /**
     * Returns the single instance of the logger.
     */
    public static get instance(): Logger {
        if (!Logger._instance) {
            Logger._instance = new Logger()
        }
        return Logger._instance
    }

    /**
     * Private constructor to enforce singleton pattern.
     */
    private constructor() {
        this.enableTags(LogTag.ALL)
    }

    /**
     * Sets the minimum log level. Messages below this level will not be printed.
     *
     * @param level The minimum log level to set.
     */
    public setLogLevel(level: LogLevel): void {
        this.minLevel = level
    }

    /**
     * Enables logging for the specified tags.
     *
     * @param tags The tags to enable.
     */
    public enableTags(...tags: LogTag[]): void {
        tags.forEach((tag) => this.enabledTags.add(tag))
    }

    /**
     * Disables logging for the specified tags.
     *
     * @param tags The tags to disable.
     */
    public disableTags(...tags: LogTag[]): void {
        tags.forEach((tag) => this.enabledTags.delete(tag))
    }

    /**
     * Determines if a message should be logged based on the log level and tags.
     *
     * @param level The log level of the message.
     * @param inputTags The tags associated with the message.
     * @returns True if the message should be logged, false otherwise.
     */
    private shouldLog(level: LogLevel, inputTags: LogTag[]): boolean {
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
     * Generic log function that logs a message at the specified log level.
     *
     * @param level The log level of the message.
     * @param tagOrTags One or more tags describing the subsystem(s).
     * @param args Additional data to print.
     */
    public log(level: LogLevel, tagOrTags: LogTag | LogTag[], ...args: unknown[]): void {
        const tags = Array.isArray(tagOrTags) ? tagOrTags : [tagOrTags]
        if (this.shouldLog(level, tags)) {
            const levelStr = LogLevel[level].toUpperCase()
            console.log(`[${levelStr}]`, `[${tags.join(", ")}]`, ...args)
        }
    }

    /**
     * Logs a message at the ERROR level.
     *
     * @param tagOrTags One or more tags describing the subsystem(s).
     * @param args Additional data to print.
     */
    public error(tagOrTags: LogTag | LogTag[], ...args: unknown[]): void {
        this.log(LogLevel.ERROR, tagOrTags, ...args)
    }

    /**
     * Logs a message at the WARN level.
     *
     * @param tagOrTags One or more tags describing the subsystem(s).
     * @param args Additional data to print.
     */
    public warn(tagOrTags: LogTag | LogTag[], ...args: unknown[]): void {
        this.log(LogLevel.WARN, tagOrTags, ...args)
    }

    /**
     * Logs a message at the INFO level.
     *
     * @param tagOrTags One or more tags describing the subsystem(s).
     * @param args Additional data to print.
     */
    public info(tagOrTags: LogTag | LogTag[], ...args: unknown[]): void {
        this.log(LogLevel.INFO, tagOrTags, ...args)
    }

    /**
     * Logs a message at the TRACE level.
     *
     * @param tagOrTags One or more tags describing the subsystem(s).
     * @param args Additional data to print.
     */
    public trace(tagOrTags: LogTag | LogTag[], ...args: unknown[]): void {
        this.log(LogLevel.TRACE, tagOrTags, ...args)
    }
}
