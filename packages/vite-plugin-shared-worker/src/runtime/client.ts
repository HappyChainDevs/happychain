import type { MessageCallback, SharedWorkerClient } from "./types"

import { type RpcPayload, makeBroadcastPayload, makePingPayload, makeRpcPayload, parsePayload } from "./payload"

export function defineClientFactory(worker: SharedWorker | Worker) {
    const port = "port" in worker ? worker.port : worker

    const callbacks = new Map<string, (payload: RpcPayload) => void>()

    // biome-ignore lint/suspicious/noExplicitAny: its a generic callback in use, type not needed here
    const messageCallbacks: MessageCallback<any>[] = []

    port.onmessage = (event) => {
        const payload = parsePayload(event.data)
        // all unsupported calls will be silently dropped
        if (!payload) return

        switch (payload.command) {
            case "rpc": {
                const callback = callbacks.get(payload.data.id)
                if (!callback) return

                callback(payload.data)
                callbacks.delete(payload.data.id)
                break
            }
            case "broadcast": {
                // 'allSettled' vs 'all' so any errors in app code don't propagate here.
                // don't need to wait for the promises to resolve
                Promise.allSettled(messageCallbacks.map((fn) => fn.apply(event, [payload.data])))
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

    setInterval(() => port.postMessage(makePingPayload()), 500)

    return {
        defineFunction(name: string) {
            return <T>(...args: T[]) => {
                const id = crypto.randomUUID()
                const payload = makeRpcPayload(id, name, args)
                return new Promise((res, rej) => {
                    callbacks.set(id, (payload) => {
                        const action = payload.isError ? rej : res
                        action(payload.args)
                    })
                    port.postMessage(payload)
                })
            }
        },
        defineClient(): SharedWorkerClient {
            return {
                addMessageListener(fn) {
                    messageCallbacks.push(fn)
                },
                dispatch(data) {
                    port.postMessage(makeBroadcastPayload(data))
                },
            }
        },
    }
}
