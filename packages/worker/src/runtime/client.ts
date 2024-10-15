import type { MessageCallback } from "./types"

import { type RpcPayload, makeBroadcastPayload, makePingPayload, makeRpcPayload, parsePayload } from "./payload"

type WorkerUnion = SharedWorker | Worker
type PortUnion = SharedWorker["port"] | Worker

export class HappyClient {
    readonly port: PortUnion

    #callbacks = new Map<string, (payload: RpcPayload) => void>()
    // biome-ignore lint/suspicious/noExplicitAny: its a generic callback in use, type not needed here
    #messageCallbacks: MessageCallback<any>[] = []

    constructor(worker: WorkerUnion) {
        this.port = "port" in worker ? worker.port : worker
        //
        this.#heartbeat()

        this.port.onmessage = this.#handleMessage.bind(this)
    }

    #heartbeat() {
        // 'keep-alive' ping so the worker knows we are still connected
        setInterval(() => this.port.postMessage(makePingPayload()), 500)
    }

    #handleMessage = (event: MessageEvent) => {
        const payload = parsePayload(event.data)
        // all unsupported calls will be silently dropped
        if (!payload) return

        switch (payload.command) {
            case "rpc": {
                const callback = this.#callbacks.get(payload.data.id)
                if (!callback) return

                callback(payload.data)
                this.#callbacks.delete(payload.data.id)
                break
            }
            case "broadcast": {
                // 'allSettled' vs 'all' so any errors in app code don't propagate here.
                // don't need to wait for the promises to resolve
                void Promise.allSettled(this.#messageCallbacks.map((fn) => fn.apply(event, [payload.data])))
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

    defineFunction(name: string) {
        return <T>(...args: T[]) => {
            const id = crypto.randomUUID()
            const payload = makeRpcPayload(id, name, args)
            return new Promise((res, rej) => {
                this.#callbacks.set(id, (payload) => {
                    const action = payload.isError ? rej : res
                    action(payload.args)
                })
                this.port.postMessage(payload)
            })
        }
    }

    // exported client function
    addMessageListener<T>(fn: MessageCallback<T>) {
        this.#messageCallbacks.push(fn)
    }

    // exported client function
    dispatch(data: unknown) {
        this.port.postMessage(makeBroadcastPayload(data))
    }
}
