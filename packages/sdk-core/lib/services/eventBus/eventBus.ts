import type { Logger } from "../logger";

/**
 * Port1 & Port2 communicate exclusively with each other
 * There can be at most one of each per scope
 * They can communicate cross-domain
 *
 * Broadcast communicates with all other broadcasts
 * using the same scope, on the same domain
 */
export enum EventBusChannel {
	Port1 = "messagechannel:port1",
	Port2 = "messagechannel:port2",
	Broadcast = "broadcastchannel",
	Forced = "forced",
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type EventPayload<T = any> = T;
export type EventKey = string | number | symbol;

export type EventHandler<T extends EventPayload = EventPayload> = (
	payload: T,
) => void;

export type EventSchema = Record<EventKey, EventPayload>;
export type EventMap = Map<EventKey, Set<EventHandler>>;

export interface EventBus<T extends EventSchema> {
	on<Key extends keyof T>(key: Key, handler: EventHandler<T[Key]>): () => void;
	off<Key extends keyof T>(key: Key, handler: EventHandler<T[Key]>): void;
	once<Key extends keyof T>(key: Key, handler: EventHandler<T[Key]>): void;
	emit<Key extends keyof T>(key: Key, payload: T[Key]): void;
	clear(): void;

	// compatibility methods
	removeAllListeners(): void;
	addListener<Key extends keyof T>(
		key: Key,
		handler: EventHandler<T[Key]>,
	): () => void;
	removeListener<Key extends keyof T>(
		key: Key,
		handler: EventHandler<T[Key]>,
	): void;
}

export type EventBusOptions = {
	scope: string;
	logger?: Logger;
	onError?: (...params: unknown[]) => void;
} & (
	| { mode: EventBusChannel.Port1; target: Window }
	| { mode: EventBusChannel.Port2 }
	| { mode: EventBusChannel.Broadcast }
	| { mode: EventBusChannel.Forced; port: MessagePort | BroadcastChannel }
);

export function eventBus<TDefinition extends EventSchema>(
	config: EventBusOptions,
): EventBus<TDefinition> {
	const handlerMap: EventMap = new Map();

	let port: MessagePort | BroadcastChannel | null = null;

	/**
	 * Initialization Strategies
	 */

	switch (config.mode) {
		case EventBusChannel.Forced:
			registerPortListener(config.port);
			break;
		case EventBusChannel.Broadcast:
			registerPortListener(new BroadcastChannel(config.scope));
			break;
		case EventBusChannel.Port1:
			initializePort1(config.target);
			break;
		case EventBusChannel.Port2:
			waitForPort2();
			break;
		default:
			throw new Error("Unable to register event bus");
	}

	function initializePort1(target: Window) {
		const mc = new MessageChannel();
		registerPortListener(mc.port1);
		target.postMessage(`happychain:${config.scope}:init`, "*", [mc.port2]);
	}

	function waitForPort2() {
		addEventListener("message", (e: MessageEvent) => {
			if (e.data === `happychain:${config.scope}:init` && !port) {
				registerPortListener(e.ports[0]);
			}
		});
	}

	function registerPortListener(_port: MessagePort | BroadcastChannel) {
		port = _port;
		// @notice - if using .addEventListener(...) syntax, .start() must be called manually
		// https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/start
		port.onmessage = (event) => {
			if (event.data.scope !== config.scope) {
				return;
			}

			for (const fn of handlerMap.get(event.data.type) ?? []) {
				try {
					fn(event.data.payload);
				} catch (e) {
					config.onError?.(e);
				}
			}
		};

		port.onmessageerror = (event) => {
			const onError = config.onError ?? config.logger?.warn;
			onError?.(event);
		};
		config.logger?.log(
			`[EventBus] Port initialized ${config.mode}=>${config.scope}`,
			location.origin,
		);
	}

	// public event bus functions
	const off: EventBus<TDefinition>["off"] = (key, handler) => {
		handlerMap.get(key)?.delete(handler);
		if (handlerMap.get(key)?.size === 0) {
			handlerMap.delete(key);
		}
	};

	const on: EventBus<TDefinition>["on"] = (key, handler) => {
		const prev = handlerMap.get(key) ?? new Set();
		handlerMap.set(key, prev.add(handler));

		// unsubscribe function
		return () => off(key, handler);
	};

	const emit: EventBus<TDefinition>["emit"] = (key, payload) => {
		if (!port) {
			config.logger?.warn(
				`[EventBus] Port not initialized ${config.mode}=>${config.scope}`,
				location.origin,
			);
		}

		port?.postMessage({ scope: config.scope, type: key, payload });
		return Boolean(port); // if port exists, assume successful
	};

	const once: EventBus<TDefinition>["once"] = (key, handler) => {
		const handleOnce: typeof handler = (payload) => {
			handler(payload);
			off(key, handleOnce);
		};

		on(key, handleOnce);
	};

	const clear: EventBus<TDefinition>["clear"] = () => {
		for (const [key, handlers] of handlerMap) {
			for (const handler of handlers) {
				off(key, handler);
			}
		}
	};

	return {
		on,
		off,
		emit,
		once,
		clear,
		removeAllListeners: clear,
		addListener: on,
		removeListener: off,
	};
}
