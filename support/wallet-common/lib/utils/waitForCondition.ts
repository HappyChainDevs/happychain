export async function waitForCondition(
    // `unknown` return type so that we can wait for things to be truthy
    callback: (...args: unknown[]) => unknown | Promise<unknown>,
    maxPollTimeMs = 30_000,
    pollIntervalMs = 50,
) {
    const done = await callback()
    if (done) return

    const start = Date.now()
    return new Promise((resolve, reject) => {
        const pollForCondition = async () => {
            if (await callback()) return resolve(true)

            if (Date.now() - start > maxPollTimeMs) {
                return reject(new Error("Condition not met within the maximum poll time"))
            }
            setTimeout(pollForCondition, pollIntervalMs)
        }

        pollForCondition()
    })
}
