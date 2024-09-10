export type Logger = Pick<typeof console, "log" | "warn" | "error">

const isProd = ["test", "production"].some((mode) => mode === import.meta.env.MODE)
const noop = () => {}
export const logger: Logger = isProd ? { log: noop, warn: noop, error: noop } : console
