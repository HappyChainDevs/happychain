import { promiseWithResolvers } from "@happychain/common"
import { Mutex, type MutexInterface } from "async-mutex"

/**
 * A mutex that only allows the latest request to proceed.
 * Previous pending requests are automatically rejected.
 */
export class LatestOnlyMutex {
    private mutex: Mutex
    private latestRequest: ((releaser: MutexInterface.Releaser) => void) | null

    constructor() {
        this.mutex = new Mutex()
        this.latestRequest = null
    }

    async acquire(): Promise<MutexInterface.Releaser> {
        const {
            promise: acquirePromise,
            resolve: resolveAcquire,
            reject: rejectAcquire,
        } = promiseWithResolvers<MutexInterface.Releaser>()

        this.latestRequest = resolveAcquire

        this.mutex.acquire().then((releaser) => {
            if (this.latestRequest === resolveAcquire) {
                resolveAcquire(releaser)
            } else {
                releaser()
                rejectAcquire(new Error("LatestOnlyMutex: Latest request was not this one"))
            }
        })

        return acquirePromise
    }
}
