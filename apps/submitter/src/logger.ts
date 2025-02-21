import env from "./env"

enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

const logLevel = {
    debug: LogLevel.DEBUG,
    info: LogLevel.INFO,
    warn: LogLevel.WARN,
    error: LogLevel.ERROR,
}[env.LOG_LEVEL]

export const logger = {
    debug(...args: Parameters<typeof console.debug>) {
        if (logLevel < LogLevel.DEBUG) return
        console.debug(...args)
    },
    info(...args: Parameters<typeof console.info>) {
        if (logLevel < LogLevel.INFO) return
        console.info(...args)
    },
    warn(...args: Parameters<typeof console.warn>) {
        if (logLevel < LogLevel.WARN) return
        console.warn(...args)
    },
    error(...args: Parameters<typeof console.error>) {
        if (logLevel < LogLevel.ERROR) return
        console.error(...args)
    },
}
