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
            if (payload) {
                if (payload.command === "rpc") {
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
                } else if (payload.command === "broadcast") {
                    await Promise.all(messageCallbacks.map((fn) => fn.apply(event, [payload.data])))
                } else if (payload.command === "ping") {
                    ports.set(port, Date.now())
                } else {
                    console.error(`Unknown payload command: ${JSON.stringify(event.data, null, 2)}`)
                }
            } else {
                console.error(`Unknown payload: ${JSON.stringify(event.data, null, 2)}`)
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
