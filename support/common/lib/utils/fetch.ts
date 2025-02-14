/**
 * Performs an HTTP request using fetch with retry capability and a timeout for each attempt.
 *
 * @param url        The URL to which the request is sent.
 * @param options    Options to customize the request (method, headers, body, etc.).
 *                   See https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#fetch_options.
 * @param maxRetries The maximum number of retry attempts in case of failure or timeout.
 *                   (Default: 3)
 * @param timeout    The maximum time (in milliseconds) to wait for each attempt before timing out.
 *                   (Default: 5000)
 *
 * @returns          A promise that resolves with the response of the request (type Response).
 *                   Throws an error if all retry attempts fail or if a timeout occurs.
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    maxRetries = 3,
    timeout = 5000,
): Promise<Response> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const signal = AbortSignal.timeout(timeout)
            const response = await fetch(url, { ...options, signal })
            return response
        } catch (error) {
            if (attempt === maxRetries) {
                throw error
            }
        }
    }

    throw new Error("Failed to complete the request.")
}
