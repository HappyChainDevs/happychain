import { trace } from "@opentelemetry/api"
import { colors, noColors } from "./colors"

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
 * Returns the {@link LogLevel} whose name matches the string, or the default level
 * ({@link LogLevel.WARN}) if the passed string does not denote a LogLevel or is undefined.
 */
export function logLevel(logLevelName: string | undefined): LogLevel {
    return LogLevel[logLevelName as keyof typeof LogLevel] ?? LogLevel.WARN
}

/**
 * Tags that categorize log messages by subsystem or feature area.
 */
export type LogTag = string

/**
 * Logger interface that injects the log tag into the logging methods automatically.
 */
export type TaggedLogger = {
    [K in keyof Logger]: Logger[K] extends (tag: LogTag, ...args: infer P) => infer R ? (...args: P) => R : Logger[K]
}

export interface LoggerOptions {
    level?: LogLevel
    /** Whether to use colors in the log messages. Defaults to true. Note: in CI, colors are never used */
    colors?: boolean
    /** Whether to show the timestamp in the log messages. Defaults to true */
    timestamp?: boolean
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
 *  const logger = Logger.create("MyTag");
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
    get logLevel(): LogLevel {
        return this.minLevel
    }

    private minSpanEventLogLevel: LogLevel = LogLevel.OFF
    get spanEventLogLevel(): LogLevel {
        return this.spanEventLogLevel
    }

    /**
     * To show or not show the timestamp in the log messages.
     * Defaults to true.
     */
    private showTimestamp = true

    /**
     * Whether to use colors in the log messages.
     */
    private useColors = true

    /**
     * Dynamically returns the colors object based on whether colors are enabled.
     */
    private get colors() {
        return this.useColors ? colors : noColors
    }

    /**
     * Set of enabled tags for filtering log messages.
     */
    private enabledTags: Set<LogTag> = new Set()

    /**
     * Returns the single instance of the logger.
     */
    public static get instance(): Logger {
        // 'this' here refers to the static class itself. The `Logger` class may be extended, so we can't
        // use Logger.xxx to interact with static methods directly.

        // biome-ignore lint/complexity/noThisInStatic: see note above
        if (!this._instance) {
            // biome-ignore lint/complexity/noThisInStatic: see note above
            this._instance = new Logger()
        }

        // biome-ignore lint/complexity/noThisInStatic: see note above
        return this._instance
    }

    public static create(
        tag: LogTag,
        { level = Logger.instance.minLevel, colors = true, timestamp = true }: LoggerOptions = {},
    ): TaggedLogger {
        const logger = new Logger()
        logger.useColors = colors
        logger.showTimestamp = timestamp
        logger.enableTags(tag)
        logger.setLogLevel(level)
        return new Proxy(logger, {
            get(target, prop, receiver) {
                const value = Reflect.get(target, prop, receiver)
                if (typeof value === "function" && ["log", "error", "warn", "info", "trace"].includes(prop as string)) {
                    return (...args: unknown[]) => {
                        const method = value as (tag: LogTag, ...args: unknown[]) => unknown
                        return method.call(target, tag, ...args)
                    }
                }
                return value
            },
        }) as TaggedLogger
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
     * Sets the minimum log level for span events. Messages below this level will not be added as span events.
     *
     * @param level The minimum log level for span events to set.
     */
    public setSpanEventLogLevel(level: LogLevel): void {
        this.minSpanEventLogLevel = level
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
        if (level > this.minLevel) return false
        // If no tags are enabled, skip everything.
        if (this.enabledTags.size === 0) return false
        // Check if any of the log's tags is in the enabled set.
        return inputTags.some((tag) => this.enabledTags.has(tag))
    }

    private shouldAddSpanEvent(level: LogLevel, inputTags: LogTag[]): boolean {
        if (level > this.minSpanEventLogLevel) return false
        if (this.enabledTags.size === 0) return false
        return inputTags.some((tag) => this.enabledTags.has(tag))
    }

    /**
     * Generates the log prelude indicating the log level, timestamp, and tags.
     *
     * @param level The log level of the message.
     * @param inputTags The tags associated with the message.
     * @returns string
     */
    private getPrelude(level: LogLevel, tags: LogTag[]): string {
        const levelStr = this.#formatLevel(level).padEnd(this.useColors ? 14 : 5, " ")
        const tagsStr = this.colors.blue(`${tags.join(", ")}`)

        return this.showTimestamp
            ? `[${levelStr}] ${this.colors.cyan(new Date().toISOString())} [${tagsStr}]`
            : `[${levelStr}] [${tagsStr}]`
    }

    #getConsoleForLevel(level: LogLevel) {
        switch (level) {
            case LogLevel.OFF:
                return () => {} // No-op for OFF level
            case LogLevel.ERROR:
                return console.error
            case LogLevel.WARN:
                return console.warn
            case LogLevel.INFO:
                return console.log
            case LogLevel.TRACE:
                return console.debug
            default:
                return console.log
        }
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
            const logger = this.#getConsoleForLevel(level)
            logger(this.getPrelude(level, tags), ...args)
        }

        if (this.shouldAddSpanEvent(level, tags)) {
            const activeSpan = trace.getActiveSpan()
            activeSpan?.addEvent("logger", {
                level: level.toString(),
                tags: tags.join(","),
                message: args.map((arg) => String(arg)).join(" "),
            })
        }
    }

    #formatLevel(level: LogLevel): string {
        switch (level) {
            case LogLevel.OFF:
                return "OFF"
            case LogLevel.ERROR:
                return this.colors.red("ERROR")
            case LogLevel.WARN:
                return this.colors.yellow("WARN")
            case LogLevel.INFO:
                return this.colors.green("INFO")
            case LogLevel.TRACE:
                return this.colors.white("TRACE")
            default:
                return "UNKNOWN"
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
