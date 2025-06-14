import type { RpcPayload, RpcRequestPayload } from "./payload"
import { makeDispatchPayload, makePingPayload, makeRpcRequestPayload, parseServerPayload } from "./payload"
import type { MessageCallback } from "./types"

type WorkerUnion = SharedWorker | Worker
type PortUnion = SharedWorker["port"] | Worker

/**
 * Maximum number of pending RPC requests that can be queued,
 * while the worker is unavailable.
 */
const MAX_QUEUE_LENGTH = 1000

/**
 * If a call hangs for longer than this time and has not recovered, it is considered dead and we reject the call.
 */
const MAX_WAIT_TIME_MS = 15_000

/**
 * The interval at which the client will send a 'ping' to the worker to check if it is still alive.
 * If the worker does not respond with a 'pong' within 1000ms, it is considered momentarily dead.
 * Whenever a pong is received, the client will flush the queue of pending RPC requests, and the
 * worker will resume normal operation.
 * A lower number will result in faster liveliness checks and faster recovery from connectivity
 * issues, but will incur more CPU usage and overhead.
 */
const PING_INTERVAL_MS = 500

/**
 * If more than this many pings is missed in a row, we will assume the worker is no longer connected
 * and will begin queueing payloads rather than sending them immediately. This is incremented
 * on 'ping', then set to zero on 'pong', so if under normal conditions, the pong counter will
 * fluctuate between 0 and 1 and back to 0, with a round trip time of roughly 0-1ms. This occurs
 * every {@link PING_INTERVAL_MS} milliseconds.
 */
const MAX_MISSED_PINGS = 1

/**
 * See README.md for general context on the shared worker architecture.
 *
 * This class is instantiated on the "client" side (web app) to enable communication with the shared
 * worker. It enables RPC-style communication with the worker (server), as well as sending and
 * receiving arbitrary (but serializable) messages.
 *
 * For the RPC side, the functions defined in a `<WorkerName>.sw.ts` files are made runnable in the
 * shared worker, and RPC versions of these functions are made available to the client, which
 * package the call into a message, and listen for the response. These methods are async.
 *
 * When importing the `.sw.ts` file (which contains the actual function definition to be run on the
 * worker), the client actually imports the RPC version of the methods.
 *
 * The client can also import the  {@link dispatch} and {@link addMessageListener} function from
 * this class, re-exported as top-level methods. These are used for sending & listening to
 * arbitrary messages.
 *
 * The client does not have access to the client instance.
 */
export class SharedWorkerClient {
    readonly port: PortUnion

    private callbacks = new Map<string, (payload: RpcPayload) => void>()

    // biome-ignore lint/suspicious/noExplicitAny: its a generic callback in use, type not needed here
    private messageCallbacks: MessageCallback<any>[] = []

    // FIFO queue for pending RPC requests
    // This does our best to ensure that calls are executed in the order they were made,
    // however if a payload is sent while the worker is not connected, but we are not aware
    // it could get re-queued after the liveness timeout. This case has potential for
    // payloads to be submitted out of order as it would be re-queued at the time of the timeout
    // not when the payload was created.
    private payloadQueue: RpcRequestPayload[] = []

    constructor(
        worker: WorkerUnion,
        private options: { name: string },
    ) {
        this.port = "port" in worker ? worker.port : worker
        this.heartbeat()
        this.port.onmessage = this.handleMessage.bind(this)
    }

    // Initialize with a high number so that on load isConnected is computed to be false.
    // It will be reset to zero when it receives the first pong.
    private pingCounter = 1_000_000

    // If dead pings exceed 1, we will assume connectivity issues, and start queueing payloads rather than sending them
    // immediately. 'ping/pong' health checks are regularly sent to verify connectivity, and when connectivity is
    // restored, the queue is flushed, and everything resumes as normal.
    private get isConnected() {
        return this.pingCounter <= MAX_MISSED_PINGS
    }

    private heartbeat() {
        // 'keep-alive' ping so the worker knows we are still connected
        setInterval(() => {
            const payload = makePingPayload()
            const wasPreviouslyConnected = this.isConnected
            this.pingCounter++
            this.port.postMessage(payload)
            if (wasPreviouslyConnected && !this.isConnected) {
                console.warn(`SharedWorkerClient: [${this.options.name}] Appears offline or inaccessible.`)
            }
        }, PING_INTERVAL_MS)
    }

    // we flush on every 'pong'. the isFlushing flag is used to prevent multiple parallel flushes
    private isFlushing = false
    private flushPayloadQueue() {
        if (this.isFlushing) return
        if (!this.payloadQueue.length) return
        this.isFlushing = true
        // Process all buffered RPC requests
        while (this.payloadQueue.length > 0) {
            if (!this.isConnected) {
                this.isFlushing = false
                return
            }
            const payload = this.payloadQueue.shift()
            this.port.postMessage(payload)
        }
        this.isFlushing = false
    }

    private handleMessage = (event: MessageEvent) => {
        const payload = parseServerPayload(event.data)
        if (!payload) {
            console.error(`Unknown SharedWorker payload received: ${JSON.stringify(event.data, null, 2)}`)
            return
        }

        switch (payload.command) {
            case "pong": {
                // if we receive a pong, worker is alive and well, we can clear the counter
                // Under normal conditions, around trip should take 0 or 1 ms. If the wait time has
                // exceeded 2500ms, something may be wrong, If there is any queued payloads, we
                // will log the warning. If there are none, then we will ignore the anomaly.
                // Date.now() - payload.ts is effectively the round trip time of the ping/pong.
                const delay = Date.now() - payload.ts
                if (!this.isConnected && delay > 2_500 && this.payloadQueue.length) {
                    console.warn(
                        `SharedWorkerClient: [${this.options.name}] delayed pong received after ${Date.now() - payload.ts} delay. Worker has recovered.`,
                    )
                }
                this.pingCounter = 0
                this.flushPayloadQueue()
                break
            }
            case "rpcResponse": {
                const callback = this.callbacks.get(payload.data.id)
                if (!callback) return
                callback(payload.data)
                this.callbacks.delete(payload.data.id)
                break
            }
            case "dispatch":
            case "broadcast": {
                // 'allSettled' vs 'all' so any errors in app code don't propagate here.
                void Promise.allSettled(this.messageCallbacks.map((fn) => fn.apply(event, [payload.data])))
                break
            }
            case "console": {
                // actually accepts all console functions, but keyof console yells
                const fn = console[payload.key as "log" | "warn" | "error"]

                // Temporary filtering of very noisy web3auth logs.
                // TODO: make this filtering generic
                if (
                    payload.data.length === 2 &&
                    payload.data[0] === "[web3auth.sw.ts]" &&
                    typeof payload.data[1] === "string"
                ) {
                    const msg = payload.data[1]
                    if (msg.startsWith("sending msg, ") || msg.startsWith("reading msg, ")) break
                }

                if (fn && typeof fn === "function") {
                    fn(...payload.data)
                }
                break
            }
        }
    }

    /**
     * Used during code generation. This maps a function which was defined and exported in the
     * worker to a local async function which executes as an RPC call to the SharedWorkerServer
     */
    __defineFunction(name: string) {
        const rpcFunc = async <T>(...args: T[]) => {
            const id = crypto.randomUUID()
            const payload = makeRpcRequestPayload(id, name, args)
            try {
                return await new Promise((res, rej) => {
                    if (this.payloadQueue.length >= MAX_QUEUE_LENGTH) {
                        return rej(
                            new Error(
                                `SharedWorkerClient: [${this.options.name}] RPC queue overflow (max ${MAX_QUEUE_LENGTH}). Dropping request.`,
                            ),
                        )
                    }

                    // if the call has not responded in a reasonable
                    // amount of time, we will simply reject the call.
                    const maxWaitTimeCheck = setTimeout(() => {
                        this.callbacks.delete(id)
                        return rej(
                            new Error(
                                `SharedWorkerClient: [${this.options.name}] RPC call timed out after ${MAX_WAIT_TIME_MS} ms`,
                            ),
                        )
                    }, MAX_WAIT_TIME_MS)

                    this.callbacks.set(id, (result) => {
                        // when callback is received, we can clear the rejection timeout
                        clearTimeout(maxWaitTimeCheck)
                        return result.isError ? rej(result.args) : res(result.args)
                    })

                    // if there is already a queue existing, we will rather enqueue it
                    // instead of sending it, so that the order of execution is preserved.
                    if (this.payloadQueue.length || !this.isConnected) {
                        this.payloadQueue.push(payload)
                    } else {
                        this.port.postMessage(payload)
                    }
                })
            } catch (_e) {
                if (!(_e instanceof Error) || !Error.captureStackTrace) throw _e

                // leave original message, merge the stacks.
                const e: Pick<Error, "stack" | "cause"> = { stack: undefined, cause: undefined }
                Error.captureStackTrace(e, rpcFunc)
                const split = e.stack?.split("\n") || []
                split.splice(0, 1, "")
                _e.stack += split.join("\n")
                console.error(_e)
                throw _e
            }
        }

        return rpcFunc
    }

    /**
     * Listen for incoming messages sent from the {@link SharedWorkerServer} toa all clients via
     * his {@link SharedWorkerServer.broadcast} method.
     */
    addMessageListener<T>(fn: MessageCallback<T>) {
        this.messageCallbacks.push(fn)
    }

    /**
     * Dispatch a message to the {@link SharedWorkerServer} who can listen to them via his
     * own {@link SharedWorkerServer.addMessageListener} method.
     */
    dispatch(data: unknown) {
        this.port.postMessage(makeDispatchPayload(data))
    }
}
