import type { MessageCallback } from "./types"

import { type RpcPayload, makeBroadcastPayload, makePingPayload, makeRpcPayload, parsePayload } from "./payload"

type WorkerUnion = SharedWorker | Worker
type PortUnion = SharedWorker["port"] | Worker

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

    constructor(worker: WorkerUnion) {
        this.port = "port" in worker ? worker.port : worker
        this.heartbeat()
        this.port.onmessage = this.handleMessage.bind(this)
    }

    private heartbeat() {
        // 'keep-alive' ping so the worker knows we are still connected
        setInterval(() => this.port.postMessage(makePingPayload()), 500)
    }

    private handleMessage = (event: MessageEvent) => {
        const payload = parsePayload(event.data)
        if (!payload) {
            console.error(`Unknown SharedWorker payload received: ${JSON.stringify(event.data, null, 2)}`)
            return
        }

        switch (payload.command) {
            case "rpc": {
                const callback = this.callbacks.get(payload.data.id)
                if (!callback) return

                callback(payload.data)
                this.callbacks.delete(payload.data.id)
                break
            }
            case "broadcast": {
                // 'allSettled' vs 'all' so any errors in app code don't propagate here.
                void Promise.allSettled(this.messageCallbacks.map((fn) => fn.apply(event, [payload.data])))
                break
            }
            case "console": {
                // actually accepts all console functions, but keyof console yells
                const fn = console[payload.key as "log" | "warn" | "error"]

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
        return <T>(...args: T[]) => {
            const id = crypto.randomUUID()
            const payload = makeRpcPayload(id, name, args)
            return new Promise((res, rej) => {
                this.callbacks.set(id, (payload) => {
                    const action = payload.isError ? rej : res
                    action(payload.args)
                })
                this.port.postMessage(payload)
            })
        }
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
        this.port.postMessage(makeBroadcastPayload(data))
    }
}
