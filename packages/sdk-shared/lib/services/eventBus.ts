import { waitForCondition } from "../utils/waitForCondition"
import { type Logger, silentLogger } from "./logger"

// Browser APIs type definition for SSR safety
type BrowserGlobal = typeof globalThis & {
    MessageChannel?: {
        new (): MessageChannel
    }
    BroadcastChannel?: {
        new (scope: string): BroadcastChannel
    }
}

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

// Type-safe references to browser message port types
type SafeMessagePort = globalThis.MessagePort
type SafeBroadcastChannel = globalThis.BroadcastChannel
type SafePort = SafeMessagePort | SafeBroadcastChannel

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
    | { mode: EventBusMode.Forced; port: SafePort }
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
    private port: SafePort | null = null
    private isServer: boolean

    constructor(private config: EventBusOptions) {
        this.isServer = typeof window === "undefined"
        if (this.isServer) return

        this.config.logger ??= silentLogger
        this.initializePort()
    }

    private initializePort(): void {
        if (this.isServer) return

        const browserGlobal = globalThis as BrowserGlobal
        switch (this.config.mode) {
            case EventBusMode.Forced:
                this.registerPortListener(this.config.port)
                break
            case EventBusMode.Broadcast:
                if (browserGlobal.BroadcastChannel) {
                    this.registerPortListener(new browserGlobal.BroadcastChannel(this.config.scope))
                }
                break
            case EventBusMode.IframePort: {
                if (browserGlobal.MessageChannel) {
                    const mc = new browserGlobal.MessageChannel()
                    this.registerPortListener(mc.port1)
                    const message = `happychain:${this.config.scope}:init`
                    this.config.target.postMessage(message, "*", [mc.port2])
                }
                break
            }
            case EventBusMode.AppPort: {
                window.addEventListener("message", (e: MessageEvent) => {
                    const message = `happychain:${this.config.scope}:init`
                    if (e.data === message) {
                        this.registerPortListener(e.ports[0])
                    }
                })
                break
            }
        }
    }

    private registerPortListener(_port: SafePort): void {
        if (this.isServer) return

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

        if (!this.isServer) {
            this.config.logger?.log(
                `[EventBus] Port initialized ${this.config.mode}=>${this.config.scope}`,
                location.origin,
            )
        }
    }

    /** Remove event handler. */
    public off<Key extends keyof SL>(key: Key, handler: EventHandler<SL, Key>): void {
        if (this.isServer) return
        this.handlerMap.get(key)?.delete(handler as EventHandler<SL>)
        if (this.handlerMap.get(key)?.size === 0) {
            this.handlerMap.delete(key)
        }
    }

    /** Register Event handler. */
    public on<Key extends keyof SL>(key: Key, handler: EventHandler<SL, Key>): () => void {
        if (this.isServer) return () => {}

        const prev = this.handlerMap.get(key) ?? new Set()
        this.handlerMap.set(key, prev.add(handler as EventHandler<SL>))

        // unsubscribe function
        return () => this.off(key, handler)
    }

    /** Emit event. */
    public async emit<Key extends keyof SE>(key: Key, payload: SE[Key]): Promise<boolean> {
        if (this.isServer) return false

        if (!this.port) {
            this.config.logger?.warn(
                `[EventBus] Port not initialized ${this.config.mode}=>${this.config.scope}`,
                location.origin,
            )
            // if port isn't initialized, poll and continue
            // to retry until connection is made
            try {
                await waitForCondition(() => Boolean(this.port), 30_000, 50)
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

        return true
    }

    /** Register event handler that will be removed after the first invocation. */
    public once<Key extends keyof SL>(key: Key, handler: EventHandler<SL, Key>): void {
        if (this.isServer) return

        const handleOnce: typeof handler = (payload) => {
            handler(payload)
            this.off(key, handleOnce)
        }

        this.on(key, handleOnce)
    }

    /** Remove all event handlers. */
    public clear(): void {
        if (this.isServer) return

        this.handlerMap.forEach((handlers, key) => {
            for (const handler of handlers) {
                this.off(key, handler)
            }
        })
    }
}
