export type Logger = Pick<typeof console, "log" | "warn" | "error">

const isProd = import.meta.env.MODE === "production"
const noop = () => {}
export const logger: Logger = isProd ? { log: noop, warn: noop, error: noop } : console
