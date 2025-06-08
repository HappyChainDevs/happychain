import { TimeoutError } from "./error"

/**
 * Returns a promise that resolves after a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Returns a promise that rejects with a {@link TimeoutError}) after a given number of milliseconds.
 * If {@link timeoutMsg} is provided, it is passed to the error constructor.
 */
export function timeoutAfter(ms: number, timeoutMsg?: string): Promise<void> {
    return new Promise((_, reject) => setTimeout(() => reject(new TimeoutError(timeoutMsg)), ms))
}
