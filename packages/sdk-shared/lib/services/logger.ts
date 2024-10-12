export type Logger = Pick<typeof console, "log" | "warn" | "error">

const beSilent = ["test", "production"].some((mode) => mode === import.meta.env.MODE)
const noop = () => {}
export const silentLogger: Logger = { log: noop, warn: noop, error: noop }
export const logger: Logger = beSilent ? silentLogger : console
