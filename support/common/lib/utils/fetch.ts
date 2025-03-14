import { promiseWithResolvers } from "./promises"
import { sleep } from "./sleep"

/**
 * Performs an HTTP request using fetch with retry capability and a timeout for each attempt.
 *
 * @param url        The URL to which the request is sent.
 * @param options    Options to customize the request (method, headers, body, etc.).
 *                   See https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#fetch_options.
 * @param maxRetries The maximum number of retry attempts in case of failure or timeout.
 *                   (Default: 3)
 * @param retryAfter The time (in milliseconds) to wait before retrying the request.
 *                   (Default: 5000)
 * @param absoluteTimeout The maximum time (in milliseconds) to wait for all retry attempts before timing out.
 *                   (Default: 15000)
 *
 * @returns          A promise that resolves with the response of the request (type Response).
 *                   Throws an error if all retry attempts fail or if a timeout occurs.
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    maxRetries = 3,
    retryAfter = 5000,
    absoluteTimeout = 15000,
): Promise<Response> {
    return new Promise((outerResolve, outerReject) => {
        ;(async () => {
            let isResolved = false
            const startTime = Date.now()

            for (let i = 0; i < maxRetries; i++) {
                const { resolve: localResolve, promise: localPromise } = promiseWithResolvers<Response>()
                const elapsed = Date.now() - startTime
                const signal = AbortSignal.timeout(absoluteTimeout - elapsed)

                fetch(url, { ...options, signal })
                    .then((response) => {
                        if (response.ok) {
                            isResolved = true
                            outerResolve(response)
                        } else if (i === maxRetries - 1) {
                            outerResolve(response)
                        } else {
                            localResolve(response)
                        }
                    })
                    .catch((err) => {
                        if (i === maxRetries - 1) {
                            outerReject(err)
                        } else {
                            localResolve(err)
                        }
                    })

                await Promise.race([localPromise, sleep(retryAfter)])
                if (isResolved) break
            }
        })()
    })
}
