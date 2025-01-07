export interface Logger {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    error: (...args: any[]) => void;
    // biome-ignore lint/suspicious/noExplicitAny: 
    info: (...args: any[]) => void;
    // biome-ignore lint/suspicious/noExplicitAny: 
    debug: (...args: any[]) => void;
    // biome-ignore lint/suspicious/noExplicitAny: 
    warn: (...args: any[]) => void;
}

export const createLogger = (): Logger => ({
    error: console.error.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console),
    warn: console.warn.bind(console)
});
