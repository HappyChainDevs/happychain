export function waitForCondition(
    callback: (...args: unknown[]) => boolean,
    maxPollTimeMs = 5_000,
    pollIntervalMs = 50,
) {
    const start = Date.now()
    return new Promise((resolve, reject) => {
        const pollForCondition = () => {
            if (callback()) {
                return resolve(true)
            }

            if (Date.now() - start > maxPollTimeMs) {
                return reject()
            }
            setTimeout(pollForCondition, pollIntervalMs)
        }

        pollForCondition()
    })
}
