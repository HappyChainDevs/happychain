import type { MessageCallback } from "./types"

import { type RpcPayload, makeBroadcastPayload, makePingPayload, makeRpcPayload, parsePayload } from "./payload"

type WorkerUnion = SharedWorker | Worker
type PortUnion = SharedWorker["port"] | Worker

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
        // all unsupported calls will be silently dropped
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

    defineFunction(name: string) {
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

    // Codegen will export this function at the top-level when importing a worker file.
    addMessageListener<T>(fn: MessageCallback<T>) {
        this.messageCallbacks.push(fn)
    }

    // Codegen will export this function at the top-level when importing a worker file.
    dispatch(data: unknown) {
        this.port.postMessage(makeBroadcastPayload(data))
    }
}
