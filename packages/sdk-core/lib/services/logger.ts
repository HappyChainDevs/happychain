export type Logger = Pick<typeof console, "log" | "warn" | "error">;

const noop = () => {};
export const logger: Logger =
	import.meta.env.NODE_ENV === "production"
		? { log: noop, warn: noop, error: noop }
		: console;
