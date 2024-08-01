export type Logger = Pick<typeof console, 'log' | 'warn' | 'error'>

export const logger: Logger = console
