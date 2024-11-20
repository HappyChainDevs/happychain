import { Mutex, type MutexInterface } from "async-mutex"

export class LatestOnlyMutex {
    private mutex: Mutex
    private latestRequest: ((releaser: MutexInterface.Releaser) => void) | null

    constructor() {
        this.mutex = new Mutex()
        this.latestRequest = null
    }

    async acquire(): Promise<MutexInterface.Releaser> {
        let resolveAcquire: (releaser: MutexInterface.Releaser) => void
        let rejectAcquire: (error: Error) => void

        const acquirePromise = new Promise<MutexInterface.Releaser>((resolve, reject) => {
            this.latestRequest = resolve
            rejectAcquire = reject
            resolveAcquire = resolve
        })

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
