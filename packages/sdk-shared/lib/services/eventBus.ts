import { waitForCondition } from "../utils/waitForCondition"
import { type Logger, silentLogger } from "./logger"
import { logger } from "./logger"

/**
 * Defines different modes in which the event bus can operate.
 */
export enum EventBusMode {
    /** Opened on an iframe, to communicate with the app. */
    IframePort = "messagechannel:port1",

    /** Opened on the app, to communicate with the iframe. */
    AppPort = "messagechannel:port2",

    /** Enables broadcast messages to all browsing contexts within the same URL domain. */
    Broadcast = "broadcastchannel",

    /**
     * Testing-only mode which enables initializing the bus with a specific MessageChannel or
     * BroadcastChannel.
     */
    Forced = "forced",
}

/**
 * Event types are identified by a key, which must be a string, number or symbol.
 */
export type EventKey = string | number | symbol

/**
 * Types for event handlers taking in a specific payload type corresponding to a key.
 */
export type EventHandler<S, K extends keyof S = keyof S> = (payload: S[K]) => void

/**
 * Defines name, logger, error handler, and mode for the event bus.
 */
export type EventBusOptions = {
    /** The unique name that identifies the bus. */
    scope: string
    logger?: Logger
    onError?: (...params: unknown[]) => void
} & (
    | { mode: EventBusMode.IframePort; target: Window }
    | { mode: EventBusMode.AppPort }
    | { mode: EventBusMode.Broadcast }
    | { mode: EventBusMode.Forced; port: MessagePort | BroadcastChannel }
)

/**
 * An event bus that enables sending/receiving messages to/from other browsing contexts (windows,
 * iframes, etc).
 *
 * This must be instantiated on both sides with the correct mode (both {@link
 * EventBusMode.Broadcast}, or {@link EventBusMode.IframePort}) and {@link EventBusMode.AppPort}.
 *
 * @typeParam SL - Schema for the listening side of the bus.
 * @typeParam SE - Schema for the emitting side of the bus.
 */
export class EventBus<SL, SE = SL> {
    private handlerMap: Map<keyof SL, Set<EventHandler<SL>>> = new Map()
    private port: MessagePort | BroadcastChannel | null = null

    constructor(private config: EventBusOptions) {
        config.logger ??= silentLogger

        switch (config.mode) {
            case EventBusMode.Forced:
                this.registerPortListener(config.port)
                break
            case EventBusMode.Broadcast:
                this.registerPortListener(new BroadcastChannel(config.scope))
                break
            case EventBusMode.IframePort: {
                const mc = new MessageChannel()
                this.registerPortListener(mc.port1)
                const message = `happychain:${config.scope}:init`
                config.target.postMessage(message, "*", [mc.port2])
                break
            }
            case EventBusMode.AppPort: {
                addEventListener("message", (e: MessageEvent) => {
                    const message = `happychain:${config.scope}:init`
                    if (e.data === message) {
                        this.registerPortListener(e.ports[0])
                    }
                })
                break
            }
        }
    }

    private registerPortListener(_port: MessagePort | BroadcastChannel) {
        this.port = _port
        // @notice - if using .addEventListener(...) syntax, .start() must be called manually
        // https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/start
        this.port.onmessage = (event) => {
            if (event.data.scope !== this.config.scope) {
                return
            }

            for (const fn of this.handlerMap.get(event.data.type) ?? []) {
                try {
                    fn(event.data.payload)
                } catch (e) {
                    this.config.onError?.(e)
                }
            }
        }

        this.port.onmessageerror = (event) => {
            const onError = this.config.onError ?? this.config.logger?.warn
            onError?.(event)
        }
        this.config.logger?.log(
            `[EventBus] Port initialized ${this.config.mode}=>${this.config.scope}`,
            location.origin,
        )
    }

    /** Remove event handler. */
    public off<Key extends keyof SL>(key: Key, handler: EventHandler<SL, Key>) {
        this.handlerMap.get(key)?.delete(handler as EventHandler<SL>)
        if (this.handlerMap.get(key)?.size === 0) {
            this.handlerMap.delete(key)
        }
    }

    /** Register Event handler. */
    public on<Key extends keyof SL>(key: Key, handler: EventHandler<SL, Key>): () => void {
        const prev = this.handlerMap.get(key) ?? new Set()
        this.handlerMap.set(key, prev.add(handler as EventHandler<SL>))

        // unsubscribe function
        return () => this.off(key, handler)
    }

    /** Emit event. */
    public async emit<Key extends keyof SE>(key: Key, payload: SE[Key]) {
        if (!this.port) {
            this.config.logger?.warn(
                `[EventBus] Port not initialized ${this.config.mode}=>${this.config.scope}`,
                location.origin,
            )
            // if port isn't initialized, poll and continue
            // to retry until connection is made
            try {
                await waitForCondition(() => Boolean(this.port), 30_000, 50)

                // biome-ignore lint/style/noNonNullAssertion: the above waitForCondition enforces that its not null
                this.port!.postMessage({
                    scope: this.config.scope,
                    type: key,
                    payload,
                })
                return true
            } catch {
                this.config.logger?.error("Failed to submit request", key, payload)
                return false
            }
        }

        this.port.postMessage({
            scope: this.config.scope,
            type: key,
            payload,
        })

        return Boolean(this.port) // if port exists, assume successful
    }

    /** Register event handler that will be removed after the first invocation. */
    public once<Key extends keyof SL>(key: Key, handler: EventHandler<SL, Key>) {
        const handleOnce: typeof handler = (payload) => {
            handler(payload)
            this.off(key, handleOnce)
        }

        this.on(key, handleOnce)
    }

    /** Remove all event handlers. */
    public clear() {
        this.handlerMap.forEach((handlers, key) => {
            for (const handler of handlers) {
                this.off(key, handler)
            }
        })
    }
}
