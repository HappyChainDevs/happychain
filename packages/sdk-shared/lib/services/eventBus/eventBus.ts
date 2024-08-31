import { waitForCondition } from "../../utils/waitForCondition"
import type { Logger } from "../logger"
import { logger } from "../logger"

/**
 * Port1 (iframe) & Port2 (dapp) communicate exclusively with each other
 * There can be at most one of each per scope
 * They can communicate cross-domain
 *
 * Broadcast communicates with all other broadcasts
 * using the same scope, on the same domain
 */
export enum EventBusChannel {
    // cross domain point A to point B messages
    IframePort = "messagechannel:port1", // iframe port
    DappPort = "messagechannel:port2", // dapp window port

    // same-domain broadcasts
    Broadcast = "broadcastchannel",

    // For testing. The port is supplied directly during construction.
    Forced = "forced",
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type EventPayload<T = any> = T
export type EventKey = string | number | symbol

export type EventHandler<T extends EventPayload = EventPayload> = (payload: T) => void

export type EventSchema = Record<EventKey, EventPayload>
export type EventMap = Map<EventKey, Set<EventHandler>>

export interface IEventBus<T extends EventSchema> {
    on<Key extends keyof T>(key: Key, handler: EventHandler<T[Key]>): () => void
    off<Key extends keyof T>(key: Key, handler: EventHandler<T[Key]>): void
    once<Key extends keyof T>(key: Key, handler: EventHandler<T[Key]>): void
    emit<Key extends keyof T>(key: Key, payload: T[Key]): void
    clear(): void

    // event emitter compatibility methods
    removeAllListeners(): void
    addListener<Key extends keyof T>(key: Key, handler: EventHandler<T[Key]>): () => void
    removeListener<Key extends keyof T>(key: Key, handler: EventHandler<T[Key]>): void
}

export type EventBusOptions = {
    scope: string
    logger?: Logger
    onError?: (...params: unknown[]) => void
} & (
    | { mode: EventBusChannel.IframePort; target: Window }
    | { mode: EventBusChannel.DappPort }
    | { mode: EventBusChannel.Broadcast }
    | { mode: EventBusChannel.Forced; port: MessagePort | BroadcastChannel }
)

export class EventBus<TDefinition extends EventSchema = EventSchema> implements IEventBus<TDefinition> {
    private handlerMap: EventMap = new Map()
    private port: MessagePort | BroadcastChannel | null = null

    constructor(private config: EventBusOptions) {
        config.logger ??= logger

        switch (config.mode) {
            case EventBusChannel.Forced:
                this.registerPortListener(config.port)
                break
            case EventBusChannel.Broadcast:
                this.registerPortListener(new BroadcastChannel(config.scope))
                break
            case EventBusChannel.IframePort: {
                const mc = new MessageChannel()
                this.registerPortListener(mc.port1)
                const message = `happychain:${config.scope}:init`
                config.target.postMessage(message, "*", [mc.port2])
                break
            }
            case EventBusChannel.DappPort: {
                addEventListener("message", (e: MessageEvent) => {
                    const message = `happychain:${config.scope}:init`
                    if (e.data === message) {
                        this.registerPortListener(e.ports[0])
                    }
                })
                break
            }
            default:
                throw new Error("Unable to register event bus")
        }

        // bind aliases
        this.removeAllListeners = this.clear.bind(this)
        this.addListener = this.on.bind(this)
        this.removeListener = this.off.bind(this)
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

    public removeListener: IEventBus<TDefinition>["off"]
    public off: IEventBus<TDefinition>["off"] = (key, handler) => {
        this.handlerMap.get(key)?.delete(handler)
        if (this.handlerMap.get(key)?.size === 0) {
            this.handlerMap.delete(key)
        }
    }

    public addListener: IEventBus<TDefinition>["on"]
    public on: IEventBus<TDefinition>["on"] = (key, handler) => {
        const prev = this.handlerMap.get(key) ?? new Set()
        this.handlerMap.set(key, prev.add(handler))

        // unsubscribe function
        return () => this.off(key, handler)
    }

    public emit: IEventBus<TDefinition>["emit"] = async (key, payload) => {
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

    public once: IEventBus<TDefinition>["once"] = (key, handler) => {
        const handleOnce: typeof handler = (payload) => {
            handler(payload)
            this.off(key, handleOnce)
        }

        this.on(key, handleOnce)
    }

    // alias
    public removeAllListeners: IEventBus<TDefinition>["clear"]
    public clear: IEventBus<TDefinition>["clear"] = () => {
        for (const [key, handlers] of this.handlerMap) {
            for (const handler of handlers) {
                this.off(key, handler)
            }
        }
    }
}
