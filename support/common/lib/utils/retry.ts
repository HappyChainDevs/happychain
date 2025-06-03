import { sleep } from "./sleep"

/**
 * Retries an asynchronous function a specified number of times with delay between retries.
 *
 * @returns The result of the successful function call
 * @throws The last error if all retries fail
 */
export async function retry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000,
    onRetry?: (attempt: number, error: unknown) => void,
): Promise<T> {
    let attempt = 0

    while (attempt <= retries) {
        try {
            return await fn() // Try the function
        } catch (error) {
            if (attempt === retries) throw error
            onRetry?.(attempt + 1, error) // Optional hook for logging or side effects
            await sleep(delay)
            attempt++
        }
    }

    throw new Error("Retry failed unexpectedly") // Should never reach here
}
