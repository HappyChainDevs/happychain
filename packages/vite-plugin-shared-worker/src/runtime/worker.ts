/// <reference lib="WebWorker" />

import type { MessageCallback, SharedWorkerServer } from "./types"

import { makeBroadcastPayload, makeConsolePayload, makeRpcPayload, parsePayload } from "./payload"

type Fn = (...rest: unknown[]) => unknown

const genName = () => `SharedWorker-${crypto.randomUUID()}`

export function defineSharedWorker(
    self: SharedWorkerGlobalScope,
    _fns: Fn[],
    workerName = genName(),
): SharedWorkerServer {
    // Filter function
    const fns = _fns.filter((fn) => typeof fn === "function")

    const map = new Map<string, Fn>()
    for (const fn of fns) {
        map.set(fn.name, fn)
    }

    const ports = new Map<MessagePort, number>()

    // iterate over ports removing the disconnected ones
    // each port should update this timestamp every 500ms
    // if the connection is successful as a result of a
    // 'ping' command
    setInterval(() => {
        const now = Date.now()
        for (const [port, date] of ports) {
            if (now - date >= 2000) {
                ports.delete(port)
            }
        }
    }, 1000)

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const messageCallbacks: MessageCallback<any>[] = []

    const start = (port: MessagePort) => {
        ports.set(port, Date.now())

        for (const key of Object.keys(console)) {
            const possible = console[key as keyof typeof console]
            if (typeof possible !== "function") return

            // @ts-expect-error override 'console' within the worker
            // so that it attempts to proxy the commands to the client,
            // prefixed by the sender filename, instead of logging into the void
            console[key] = (...args: unknown[]) =>
                port.postMessage(makeConsolePayload(key, [`[${workerName}]`, ...args]))
        }

        port.onmessage = async (event) => {
            const payload = parsePayload(event.data)
            if (!payload) {
                console.error(`Unknown payload: ${JSON.stringify(event.data, null, 2)}`)
                return
            }

            switch (payload.command) {
                case "rpc": {
                    const fn = map.get(payload.data.name)
                    if (fn) {
                        try {
                            const result = await fn.apply(event, payload.data.args)
                            port.postMessage(makeRpcPayload(payload.data.id, payload.data.name, result))
                        } catch (e: unknown) {
                            const errorMsg = e && typeof e === "object" && "message" in e ? e.message : e
                            console.error(
                                `Error calling function '${payload.data.name}: ${JSON.stringify(event.data, null, 2)}'`,
                                errorMsg,
                            )
                        }
                    } else {
                        console.error(`Unknown message: ${JSON.stringify(payload, null, 2)}`)
                    }
                    break
                }
                case "broadcast": {
                    void Promise.allSettled(messageCallbacks.map((fn) => fn.apply(event, [payload.data])))
                    break
                }
                case "ping": {
                    ports.set(port, Date.now())
                    break
                }
                default: {
                    console.error(`Unknown payload command: ${JSON.stringify(event.data, null, 2)}`)
                }
            }
        }
    }

    self.onconnect = (event) => {
        const port = event.ports[0]
        start(port)
        console.log("Started as SharedWorker")
    }

    // Start as web worker, if not a shared worker
    if (!("SharedWorkerGlobalScope" in self)) {
        start(self as unknown as MessagePort)
        console.log("Started as WebWorker")
    }

    return {
        ports() {
            return [...ports.keys()]
        },
        dispatch(port, data) {
            port.postMessage(makeBroadcastPayload(data))
        },
        addMessageListener(fn) {
            messageCallbacks.push(fn)
        },
        broadcast(data) {
            for (const port of ports.keys()) {
                port.postMessage(makeBroadcastPayload(data))
            }
        },
    }
}
