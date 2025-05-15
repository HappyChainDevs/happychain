export type Logger = Pick<typeof console, "log" | "warn" | "error">

const MODE = import.meta.env.MODE ?? "production"
const isProd = ["test", "production"].some((mode) => mode === MODE)
const noop = () => {}
export const silentLogger: Logger = { log: noop, warn: noop, error: noop }
export const logger: Logger = isProd ? silentLogger : console
