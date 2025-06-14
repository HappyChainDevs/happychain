import { type Result, TimeoutError, tryCatchAsync } from "../utils/error"
import { type PromiseWithResolvers, delayed, promiseWithResolvers } from "../utils/promises"

type Node<T> = {
    pwr: PromiseWithResolvers<T>
    next: Node<T> | null
}

/**
 * A simple stream implementation: producers can push values onto the stream,
 * while a consumer can wait on and consume the next incoming values from the stream.
 *
 * Consuming values is destructive: whenever {@link consume} is called (all the ways to consume eventually call
 * it), the value will no longer be available to other consumers (even if the value hasn't been produced yet).
 *
 * To safely consume the stream in multiple locations, you can call {@link fork} which creates
 * a new stream that will non-destructively receive all the values in the original stream. This
 * only applies to new values, not to the values that have already been buffered in the stream.
 * The source stream for a fork is called "the upstream". Closing the upstream closes the fork.
 *
 * Closing a stream causes a promise rejection with value {@link Stream.END}
 * to occur when calling {@link consume} and the values have run out.
 */
export class Stream<T extends Exclude<unknown, undefined>> implements AsyncIterable<T> {
    #head: Node<T> = { pwr: promiseWithResolvers(), next: null }
    #tail: Node<T> = this.#head
    #forks?: Set<Stream<T>>
    #upstream?: Stream<T>

    /** When closing the stream, will reject with this value when reaching the end of the stream. */
    static readonly END = Symbol()

    // =================================================================================================================
    // PRIMITIVE OPERATIONS

    /** Pushes a value onto the stream and returns it. */
    push(value: T): T {
        this.#tail.pwr.resolve(value)
        this.#tail.next = { pwr: promiseWithResolvers(), next: null }
        this.#tail = this.#tail.next
        this.#forks?.forEach((fork) => fork.push(value))
        return value
    }

    /**
     * Returns the next value in the stream, waiting until it
     * becomes available. This can reject if the stream is closed.
     *
     * If a timeout is provided, the will reject with a {@link TimeoutError}.
     * Note that a timeout of 0 effectively turns this into a polling function.
     */
    async consume(timeout?: number): Promise<T> {
        const promise = this.#head.pwr.promise
        if (this.#head.next) this.#head = this.#head.next
        else this.#head = this.#tail = { pwr: promiseWithResolvers(), next: null }
        if (timeout === undefined) return await promise
        const value = await Promise.race([promise, delayed(timeout, Stream.#TIMEOUT)])
        if (value === Stream.#TIMEOUT) throw new TimeoutError()
        return value
    }
    static readonly #TIMEOUT = Symbol()

    /**
     * Closes the stream, causing a reject for consumers waiting at the tail of the stream, and closing all the forks.
     */
    close() {
        this.#tail.pwr.reject(Stream.END)
        this.#forks?.forEach((fork) => fork.close())
        const upstream = this.#upstream
        if (upstream) {
            if (!upstream.#forks) return
            upstream.#forks.delete(this)
            if (!upstream.#forks.size) upstream.#forks = undefined
        }
    }

    /**
     * Forks the stream, creating a new stream that will receive all the values pushed to stream from now on. The fork
     * does not see the values buffered currently buffered in the stream. The fork will close when the upstream closes.
     */
    fork(): Stream<T> {
        const fork = new Stream<T>()
        fork.#upstream = this
        if (!this.#forks) this.#forks = new Set()
        this.#forks.add(fork)
        return fork
    }

    // =================================================================================================================
    // CONVENIENCE

    // You could have implemented everything below yourself on top of the primitives!

    /**
     * An iterator over the values of the stream, which blocks while waiting on new values until the stream is closed.
     */
    async *values(): AsyncIterableIterator<T> {
        try {
            while (true) yield await this.consume()
        } catch (e) {
            if (e === Stream.END) return
            throw e // This should never happen, but just in case we pass it through.
        }
    }

    [Symbol.asyncIterator] = () => this.values() as AsyncIterableIterator<T>

    /**
     * Subscribe to the stream, consuming all values in the stream (including
     * already buffered ones) and feeding them to the provided callback.
     *
     * If {@link closeCallback} if provided, it is called when the stream closes.
     *
     * If {@link fork} is true, forks this stream and applies on the fork instead (default: false).
     * Note that this means that existing buffered values won't be consumed.
     *
     * Returns an unsubscribe function, which guarantees the callback won't
     * be called on the next value (unless that value is already in flight).
     */
    subscribe(callback: (value: T) => unknown, closeCallback?: () => unknown, fork?: boolean): () => void {
        const source = fork ? this.fork() : this
        let active = true
        const abort = promiseWithResolvers()
        void (async () => {
            while (active) {
                const next = source.consume().then(
                    (value) => callback(value),
                    () => {
                        closeCallback?.()
                        active = false
                    },
                )
                await Promise.race([next, abort.promise])
            }
        })()
        return () => {
            active = false
            abort.resolve(undefined)
        }
    }

    /**
     * Returns a new stream and {@link subscribe|subscribes} to this stream (the receiver of this
     * method), passing both the returned stream and the value to {@link fn}.
     *
     * The returned stream closes when this stream closes.
     *
     * If {@link fork} is true, forks this stream and applies on the fork instead.
     */
    subscriber<U>(fn: (stream: Stream<U>, value: T) => unknown, fork = false): Stream<U> {
        const stream = new Stream<U>()
        // biome-ignore format: terse
        this.subscribe((value) => fn(stream, value), () => { stream.close() }, fork)
        return stream
    }

    /**
     * Returns a new {@link subscriber} stream that gets pushed the result of applying
     * {@link fn} to all the new values of this stream, but only if this result is
     * not undefined. Essentially implements mapping and filtering in a single pass.
     */
    filterMap<U>(fn: (value: T) => U | undefined, fork = false): Stream<U> {
        return this.subscriber((stream, value) => {
            const result = fn(value)
            if (result !== undefined) stream.push(result)
        }, fork)
    }

    /**
     * Returns a new {@link subscriber} stream that gets pushed the result
     * of applying {@link fn} to all the new values of this stream.
     */
    map<U>(fn: (value: T) => U, fork = false): Stream<U> {
        return this.subscriber((stream, value) => stream.push(fn(value)), fork)
    }

    /**
     * Returns a new {@link subscriber} stream that gets pushed all
     * the new values of this stream that pass the given predicate.
     */
    filter(predicate: (value: T) => boolean, fork = false): Stream<T> {
        return this.subscriber((stream, value) => {
            if (predicate(value)) stream.push(value)
        }, fork)
    }

    /**
     * Returns a new stream that receives all the values from the supplied streams.
     * The stream will be closed once all its upstreams are closed.
     *
     * If {@link fork} is true, forks the provided upstreams before doing
     * this. Defaults to false.
     */
    static join<U>(streams: Stream<U>[], fork = false): Stream<U> {
        const joined = new Stream<U>()
        let closed = 0
        for (const stream of streams)
            // biome-ignore format: terse
            stream.subscribe(
                (value) => joined.push(value),
                () => { if (++closed === streams.length) joined.close() },
                fork)
        return joined
    }

    /**
     * Returns a stream of fulfilled promise results, in resolution order. Rejections are
     * ignored (i.e. you must handle them yourself if they can happen, or an exception
     * will escape). The stream closes after all the promises are fulfilled or rejected.
     */
    static ofFulfilled<U>(...promises: Promise<U>[]): Stream<U> {
        const stream = new Stream<U>()
        promises.forEach((promise) => promise.then((value) => stream.push(value)))
        void Promise.allSettled(promises).then(() => stream.close())
        return stream
    }

    /**
     * Returns a stream of rejected promise results (of assumed type `U`), in resolution order. Successful
     * fulfillments are ignored. The stream closes after all the promises are fulfilled or rejected.
     *
     * e.g. `await Stream.join(myStream, Stream.ofRejected(timeoutAfter(1000)))
     */
    static ofRejected<U = unknown>(...promises: Promise<unknown>[]): Stream<U> {
        const stream = new Stream<U>()
        promises.forEach((promise) => promise.catch((value) => stream.push(value)))
        void Promise.allSettled(promises).then(() => stream.close())
        return stream
    }

    /**
     * Returns a stream of promise results (resolved or rejected with assumed rejection type `Err`),
     * wrapped in a {@link Result}, in settlement order. The streams closes after all the promises settle.
     */
    static of<U, Err extends object = object>(...promises: Promise<U>[]): Stream<Result<U, Err>> {
        const stream = new Stream<Result<U, Err>>()
        promises.forEach(async (promise) => stream.push(await tryCatchAsync(promise)))
        void Promise.allSettled(promises).then(() => stream.close())
        return stream
    }
}
