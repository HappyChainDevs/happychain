export type Logger = Pick<typeof console, 'log' | 'warn' | 'error'>

const noop = () => {}
export const logger: Logger = { log: noop, warn: noop, error: noop }
