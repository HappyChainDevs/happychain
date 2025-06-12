/// <reference lib="WebWorker" />

import {
    makeBroadcastPayload,
    makeConsolePayload,
    makeDispatchPayload,
    makeRpcResponsePayload,
    parseClientPayload,
} from "./payload"
import type { MessageCallback, ServerInterface } from "./types"

type Fn = (...rest: unknown[]) => unknown

const genName = () => `SharedWorker-${crypto.randomUUID()}`

/**
 * remove port.onmessage from stack trace. This runs on the assumption that the stack will have 10
 * or fewer frames. If there are more frames than this we are dropping them anyways, as 10 is the
 * current (default)limit, so the risk of dropping one extra frame here is low.
 */
function parseAndFormatStack(stack: string | undefined): string {
    const split = stack?.split("\n") ?? []

    // if the last frame is not 'port.onmessage' then frames have been missed
    const framesAreMissing = split.length && !split[split.length - 1].includes("port.onmessage")

    if (framesAreMissing) {
        // An unknown amount of frames are missing.
        split.push("\n    --- <frames omitted> ---\n")
    } else if (split.length) {
        // no frames are missed. remove port.onmessage as it isn't helpful
        split.splice(split.length - 1, 1)
    }

    return split.join("\n")
}

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
        for (const fn of filteredFns) this._functions.set(`__FUNC_${idx++}__`, fn)

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
                if (now - date >= 2000) this._ports.delete(port)
            }
        }, 1000)
    }

    private connect() {
        // Shared workers unsupported, start as web worker
        if (!("SharedWorkerGlobalScope" in self)) {
            this.start(self as unknown as MessagePort)
            return
        }

        this._scope.onconnect = (event) => {
            const port = event.ports[0]
            this.start(port)
        }
    }

    private start(port: MessagePort) {
        this._ports.set(port, Date.now())

        // We will send an initial un-requested 'pong' message to the client to indicate that the
        // worker is ready immediately, and not wait for the client to send a 'ping' message.
        // this is especially useful if the clients PING_INTERVAL_MS is set to a higher value
        // and we don't want to wait until that interval's next tick before making requests
        port.postMessage({ ts: Date.now(), command: "pong" })

        port.onmessage = async (event) => {
            const payload = parseClientPayload(event.data)
            if (!payload) {
                console.error(`Unknown payload: ${JSON.stringify(event.data, null, 2)}`)
                return
            }

            switch (payload.command) {
                case "rpcRequest": {
                    const fn = this._functions.get(payload.data.name)
                    if (fn) {
                        try {
                            const result = await fn.apply(event, payload.data.args)
                            port.postMessage(makeRpcResponsePayload(payload.data.id, payload.data.name, result))
                        } catch (e: unknown) {
                            const errorMsg = e && typeof e === "object" && "message" in e ? e.message : e
                            const func = this._functions.get(payload.data.name)

                            if (func?.name) {
                                const err = e instanceof Error ? e : new Error(e?.toString())

                                err.stack = parseAndFormatStack(err.stack)

                                if (e instanceof Error) {
                                    port.postMessage(
                                        makeRpcResponsePayload(payload.data.id, payload.data.name, err, true),
                                    )
                                }
                            } else {
                                console.error(`Unknown function called ${payload.data.name}`, errorMsg)
                            }
                        }
                    } else {
                        console.error(`Unknown message: ${JSON.stringify(payload, null, 2)}`)
                    }
                    break
                }
                case "dispatch": {
                    void Promise.allSettled(this._messageCallbacks.map((fn) => fn.apply(event, [payload.data])))
                    break
                }
                case "ping": {
                    this._ports.set(port, payload.ts)
                    port.postMessage({ ts: payload.ts, command: "pong" })
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
        port.postMessage(makeDispatchPayload(data))
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
