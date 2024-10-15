/// <reference lib="WebWorker" />

import type { MessageCallback } from "./types"

import { makeBroadcastPayload, makeConsolePayload, makeRpcPayload, parsePayload } from "./payload"

type Fn = (...rest: unknown[]) => unknown

const genName = () => `SharedWorker-${crypto.randomUUID()}`

export class HappyWorker {
    private _ports = new Map<MessagePort, number>()
    private readonly fns: Fn[]
    private readonly map = new Map<string, Fn>()
    private readonly scope: SharedWorkerGlobalScope

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    private messageCallbacks: MessageCallback<any>[] = []

    constructor(
        scope: SharedWorkerGlobalScope,
        _fns: Fn[],
        public readonly workerName = genName(),
    ) {
        this.scope = scope
        // Filter function
        this.fns = _fns.filter((fn) => typeof fn === "function")

        for (const fn of this.fns) {
            this.map.set(fn.name, fn)
        }

        this.heartbeat()
        this.connect()
    }

    private heartbeat() {
        // iterate over ports removing the disconnected ones
        // each port should update this timestamp every 500ms
        // if the connection is successful as a result of a
        // 'ping' command
        setInterval(() => {
            const now = Date.now()
            for (const [port, date] of this._ports) {
                if (now - date >= 2000) {
                    this._ports.delete(port)
                }
            }
        }, 1000)
    }

    private start = (port: MessagePort) => {
        this._ports.set(port, Date.now())

        for (const key of Object.keys(console)) {
            const possible = console[key as keyof typeof console]
            if (typeof possible !== "function") return

            // @ts-expect-error override 'console' within the worker
            // so that it attempts to proxy the commands to the client,
            // prefixed by the sender filename, instead of logging into the void
            console[key] = (...args: unknown[]) =>
                port.postMessage(makeConsolePayload(key, [`[${this.workerName}]`, ...args]))
        }

        port.onmessage = async (event) => {
            const payload = parsePayload(event.data)
            if (!payload) {
                console.error(`Unknown payload: ${JSON.stringify(event.data, null, 2)}`)
                return
            }

            switch (payload.command) {
                case "rpc": {
                    const fn = this.map.get(payload.data.name)
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
                    void Promise.allSettled(this.messageCallbacks.map((fn) => fn.apply(event, [payload.data])))
                    break
                }
                case "ping": {
                    this._ports.set(port, Date.now())
                    break
                }
                default: {
                    console.error(`Unknown payload command: ${JSON.stringify(event.data, null, 2)}`)
                }
            }
        }
    }

    private connect() {
        this.scope.onconnect = (event) => {
            const port = event.ports[0]
            this.start(port)
            console.log("Started as SharedWorker")
        }

        // Start as web worker, if not a shared worker
        if (!("SharedWorkerGlobalScope" in self)) {
            this.start(self as unknown as MessagePort)
            console.log("Started as WebWorker")
        }
    }

    ports() {
        return [...this._ports.keys()]
    }
    dispatch(port: MessagePort, data: unknown) {
        port.postMessage(makeBroadcastPayload(data))
    }
    addMessageListener<T>(fn: MessageCallback<T>) {
        this.messageCallbacks.push(fn)
    }
    broadcast(data: unknown) {
        for (const port of this._ports.keys()) {
            port.postMessage(makeBroadcastPayload(data))
        }
    }
}
