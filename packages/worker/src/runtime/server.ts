/// <reference lib="WebWorker" />

import type { MessageCallback, ServerInterface } from "./types"

import { makeBroadcastPayload, makeConsolePayload, makeRpcPayload, parsePayload } from "./payload"

type Fn = (...rest: unknown[]) => unknown

const genName = () => `SharedWorker-${crypto.randomUUID()}`

/**
 * See README.md for general context on the shared worker architecture.
 *
 * An instance of this class is made available as a global `worker` variable in your
 * `<WorkerName>.sw.ts` file.
 *
 * It is responsible for listening to messages sent from the {@link SharedWorkerClient} and mapping
 * said message to an exported function by the worker (defined in your `.sw.ts` file). It executes
 * the function then returns the result to the client.
 *
 * The public functions of this class can also be used to exchange arbitrary (but serializable)
 * messages between the worker and its clients.
 */
export class SharedWorkerServer implements ServerInterface {
    // maps heartbeat ports to the latest heartbeat
    private readonly _ports = new Map<MessagePort, number>()
    private readonly _functions = new Map<string, Fn>()
    private readonly _scope: SharedWorkerGlobalScope
    // biome-ignore lint/suspicious/noExplicitAny: MessageCallback is generic and accepts any type here
    private readonly _messageCallbacks: MessageCallback<any>[] = []

    constructor(
        scope: SharedWorkerGlobalScope,
        fns: Fn[],
        public readonly workerName = genName(),
    ) {
        this._scope = scope

        this.patchConsole()

        // Filter function
        const filteredFns = fns.filter((fn) => typeof fn === "function")

        let idx = 0

        // Indexed based function recovery so that when the code is minified, both sides of the RPC
        // service still match
        for (const fn of filteredFns) {
            this._functions.set(`__FUNC_${idx++}__`, fn)
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

    private connect() {
        // Shared workers unsupported, start as web worker
        if (!("SharedWorkerGlobalScope" in self)) {
            this.start(self as unknown as MessagePort)
            console.log("Started as WebWorker")
            return
        }

        this._scope.onconnect = (event) => {
            const port = event.ports[0]
            this.start(port)
            console.log(`Started as SharedWorker. Client #${this._ports.size}`)
        }
    }

    private start(port: MessagePort) {
        this._ports.set(port, Date.now())

        port.onmessage = async (event) => {
            const payload = parsePayload(event.data)
            if (!payload) {
                console.error(`Unknown payload: ${JSON.stringify(event.data, null, 2)}`)
                return
            }

            switch (payload.command) {
                case "rpc": {
                    const fn = this._functions.get(payload.data.name)
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
                    void Promise.allSettled(this._messageCallbacks.map((fn) => fn.apply(event, [payload.data])))
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

    /**
     * Within a Worker there is no console available, so this attempts to remedy that
     *
     * Overrides all console.___ functions with a postMessage attempt
     * to execute the console function on the client instead. Since this overwrites
     * console functions directly, logs will be viewable only on the most recently
     * connected tab/window
     */
    private patchConsole() {
        for (const key of Object.keys(console)) {
            const possible = console[key as keyof typeof console]
            if (typeof possible !== "function") return

            // @ts-expect-error
            // Override 'console' within the worker so that it attempts to proxy the commands to the client,
            // prefixed by the sender filename, instead of logging into the void
            console[key] = (...args: unknown[]) => {
                for (const port of this._ports.keys()) {
                    port.postMessage(makeConsolePayload(key, [`[${this.workerName}]`, ...args]))
                }
            }
        }
    }

    /**
     * All connected 'clients'.
     *
     * Each client is a separate browsing context
     * such as a new window, or new tab.
     *
     * This list is pruned regularly via the scheduled
     * 'heartbeat' check.
     */
    ports() {
        return [...this._ports.keys()]
    }

    /**
     * Dispatch a message to a specific client.
     */
    dispatch(port: MessagePort, data: unknown) {
        port.postMessage(makeBroadcastPayload(data))
    }

    /**
     * Listen for incoming messages sent from connected clients
     */
    addMessageListener<T>(fn: MessageCallback<T>) {
        this._messageCallbacks.push(fn)
    }

    /**
     * Dispatch a message to all connected clients.
     */
    broadcast(data: unknown) {
        for (const port of this._ports.keys()) {
            port.postMessage(makeBroadcastPayload(data))
        }
    }
}
