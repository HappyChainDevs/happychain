import { promiseWithResolvers } from "./promises"

/**
 * Creates a critical-section mutex (aka lock) that can be used so that the execution of two pieces
 * of code do not overlap.
 *
 * You can run a function in a locked context with {@link locked}.
 *
 * It's also possible to manually manage the lock with {@link acquire} and {@link release}, however
 * this is not recommended — using `locked` will insert the proper try-finally statement for you
 * and makes it impossible to commit mistakes like releasing a lock that isn't owned.
 */
export class Mutex {
    private promise: Promise<void> = Promise.resolve()
    private resolve: () => void = () => {}

    /** Acquies the lock. */
    async acquire() {
        while (true) {
            const promise = this.promise
            await promise
            if (promise === this.promise) break
            // Otherwise, someone else was waiting for the lock and acquired it before us.
        }
        const pwr = promiseWithResolvers<void>()
        this.promise = pwr.promise
        this.resolve = pwr.resolve
    }

    /** Releases the lock. */
    release() {
        this.resolve()
    }

    /**
     * Runs the provided function with the provided arguments, automatically acquiring and releasing
     * the lock.
     */
    async locked<Args extends unknown[], Result>(
        fn: (...args: Args) => Result,
        ...args: Args
    ): Promise<Awaited<Result>> {
        await this.acquire()
        try {
            return await fn(...args)
        } finally {
            this.release()
        }
    }
}
