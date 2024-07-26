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
export type EventHandler<TPayload = any> = (payload: TPayload) => void;
export type EventKey = string | number | symbol;
export type EventMap = Record<EventKey, EventHandler>;
export type Bus = Map<EventKey, Set<EventHandler>>;

export interface EventBus<T extends EventMap = EventMap> {
	on<Key extends keyof T>(key: Key, handler: T[Key]): () => void;
	off<Key extends keyof T>(key: Key, handler: T[Key]): void;
	emit<Key extends keyof T>(key: Key, payload: Parameters<T[Key]>[0]): void;
	once<Key extends keyof T>(key: Key, handler: T[Key]): void;
	clear(): void;

	// compatibility methods
	removeAllListeners(): void;
	addListener<Key extends keyof T>(key: Key, handler: T[Key]): () => void;
	removeListener<Key extends keyof T>(key: Key, handler: T[Key]): void;
}

export type EventBusOptions = {
	scope: string;
	logger?: Pick<typeof console, "log" | "warn" | "error">;
	onError?: (...params: unknown[]) => void;
} & (
	| { mode: EventBusChannel.Port1; target: Window }
	| { mode: EventBusChannel.Port2 }
	| { mode: EventBusChannel.Broadcast }
	| { mode: EventBusChannel.Forced; port: MessagePort | BroadcastChannel }
);

export function eventBus<E extends EventMap>(
	config: EventBusOptions,
): EventBus<E> {
	const bus: Bus = new Map();
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

			for (const fn of bus.get(event.data.type) ?? []) {
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
	const off: EventBus<E>["off"] = (key, handler) => {
		bus.get(key)?.delete(handler);
		if (bus.get(key)?.size === 0) {
			bus.delete(key);
		}
	};

	const on: EventBus<E>["on"] = (key, handler) => {
		const prev = bus.get(key) ?? new Set();
		bus.set(key, prev.add(handler));

		// unsubscribe function
		return () => off(key, handler);
	};

	const emit: EventBus<E>["emit"] = (key, payload) => {
		if (!port) {
			config.logger?.warn(
				`[EventBus] Port not initialized ${config.mode}=>${config.scope}`,
				location.origin,
			);
		}

		port?.postMessage({ scope: config.scope, type: key, payload });
		return Boolean(port); // if port exists, assume successful
	};

	const once: EventBus<E>["once"] = (key, handler) => {
		const handleOnce = (payload: Parameters<typeof handler>) => {
			handler(payload);
			off(key, handleOnce as typeof handler);
		};

		on(key, handleOnce as typeof handler);
	};

	const clear: EventBus<E>["clear"] = () => {
		for (const [key, handlers] of bus) {
			for (const handler of handlers) {
				off(key, handler as E[typeof key]);
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
