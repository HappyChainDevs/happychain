export type Logger = Pick<typeof console, "log" | "warn" | "error">

const env = import.meta.env ?? process.env
const isProd = ["test", "production"].some((mode) => mode === env.MODE)
const noop = () => {}
export const silentLogger: Logger = { log: noop, warn: noop, error: noop }
export const logger: Logger = isProd ? silentLogger : console
