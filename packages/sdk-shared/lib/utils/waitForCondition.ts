export async function waitForCondition(
    callback: (...args: unknown[]) => boolean | Promise<boolean>,
    maxPollTimeMs = 30_000,
    pollIntervalMs = 50,
) {
    const done = await callback()
    if (done) return

    const start = Date.now()
    return new Promise((resolve, reject) => {
        const pollForCondition = async () => {
            if (await callback()) {
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
