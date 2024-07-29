import { type Mock, beforeEach, describe, expect, it, mock } from "bun:test";
import { setTimeout } from "node:timers/promises";
import {
	type EventBus,
	EventBusChannel,
	type EventBusOptions,
	eventBus,
} from "./eventBus";

describe("event bus", () => {
	describe("message channel events", () => {
		let broadcastConfig: Omit<EventBusOptions, "mode">;

		let emitterBusConfig: EventBusOptions;
		let listenerBusConfig: EventBusOptions;

		let args: unknown;
		let mockCallback: Mock<(a: unknown) => void>;
		beforeEach(() => {
			broadcastConfig = {
				scope: crypto.randomUUID(),
				logger: { log: mock(), warn: mock(), error: mock() },
			};

			// using forced instead of MessagePort 1/2 to skip cross-window handshake
			const mc = new MessageChannel();
			emitterBusConfig = {
				...broadcastConfig,
				mode: EventBusChannel.Forced,
				port: mc.port1,
			};

			listenerBusConfig = {
				...broadcastConfig,
				mode: EventBusChannel.Forced,
				port: mc.port2,
			};

			args = { data: true, version: 1 };
			mockCallback = mock((a: typeof args) => {});
		});

		it("connects and communicates as expected", async () => {
			const emitterBus = eventBus(emitterBusConfig);
			const listenerBus = eventBus(listenerBusConfig);

			listenerBus.on("callback", mockCallback);

			emitterBus.emit("callback", args);
			emitterBus.emit("callback", args);
			emitterBus.emit("callback", args);

			await setTimeout(0);
			expect(mockCallback).toHaveBeenCalledTimes(3);
		});
	});
	describe("broadcast events", () => {
		let broadcastConfig: EventBusOptions;

		let args: unknown;
		let mockCallback: Mock<(a: unknown) => void>;
		beforeEach(() => {
			broadcastConfig = {
				scope: crypto.randomUUID(),
				logger: { log: mock(), warn: mock(), error: mock() },
				mode: EventBusChannel.Broadcast,
			} satisfies EventBusOptions;

			args = { data: true, version: 1 };
			mockCallback = mock((a: typeof args) => {});
		});
		it("[on] emits and listens multiple times", async () => {
			const emitterBus = eventBus(broadcastConfig);
			const listenerBus = eventBus(broadcastConfig);

			listenerBus.on("callback", mockCallback);
			emitterBus.emit("callback", args);
			emitterBus.emit("callback", args);
			emitterBus.emit("callback", args);

			await setTimeout(0);

			expect(mockCallback).toHaveBeenCalledTimes(3);
			expect(mockCallback.mock.calls[0][0]).toStrictEqual(args);
		});

		it("[once] emits and listens once", async () => {
			const emitterBus = eventBus(broadcastConfig);
			const listenerBus = eventBus(broadcastConfig);
			listenerBus.once("callback", mockCallback);
			emitterBus.emit("callback", args);
			emitterBus.emit("callback", args);
			emitterBus.emit("callback", args);

			await setTimeout(0);

			expect(mockCallback).toHaveBeenCalledTimes(1);
			expect(mockCallback.mock.calls[0][0]).toStrictEqual(args);
		});

		it("[on/off] returns unsubscribe method from on", async () => {
			const emitterBus = eventBus(broadcastConfig);
			const listenerBus = eventBus(broadcastConfig);
			const off = listenerBus.on("callback", mockCallback);
			emitterBus.emit("callback", args);
			emitterBus.emit("callback", args);
			await setTimeout(0);
			off();
			emitterBus.emit("callback", args);

			await setTimeout(0);

			expect(mockCallback).toHaveBeenCalledTimes(2);
			expect(mockCallback.mock.calls[0][0]).toStrictEqual(args);
		});

		it("[off] stops listening to events", async () => {
			const emitterBus = eventBus(broadcastConfig);
			const listenerBus = eventBus(broadcastConfig);
			listenerBus.on("callback", mockCallback);
			emitterBus.emit("callback", args);
			emitterBus.emit("callback", args);
			await setTimeout(0);
			listenerBus.off("callback", mockCallback);
			emitterBus.emit("callback", args);

			await setTimeout(0);

			expect(mockCallback).toHaveBeenCalledTimes(2);
			expect(mockCallback.mock.calls[0][0]).toStrictEqual(args);
		});

		it("[clear] empties all callbacks", async () => {
			const emitterBus = eventBus(broadcastConfig);
			const listenerBus = eventBus(broadcastConfig);
			const args2 = { data: true, version: 2 };
			const mockCallback2 = mock((a: typeof args2) => {});

			listenerBus.on("callback", mockCallback);
			listenerBus.on("callback-2", mockCallback2);

			listenerBus.clear();

			emitterBus.emit("callback", args);
			emitterBus.emit("callback", args);
			emitterBus.emit("callback-2", args2);

			await setTimeout(0);

			expect(mockCallback).toHaveBeenCalledTimes(0);
			expect(mockCallback2).toHaveBeenCalledTimes(0);
		});

		it("subscribes to multiple events", async () => {
			const emitterBus = eventBus(broadcastConfig);
			const listenerBus = eventBus(broadcastConfig);
			const args2 = { data: true, version: 2 };
			const mockCallback2 = mock((a: typeof args2) => {});

			listenerBus.on("callback", mockCallback);
			listenerBus.on("callback-2", mockCallback2);
			emitterBus.emit("callback", args);
			emitterBus.emit("callback", args);
			emitterBus.emit("callback-2", args2);

			await setTimeout(0);

			expect(mockCallback).toHaveBeenCalledTimes(2);
			expect(mockCallback.mock.calls[0][0]).toStrictEqual(args);
			expect(mockCallback2).toHaveBeenCalledTimes(1);
			expect(mockCallback2.mock.calls[0][0]).toStrictEqual(args2);
		});
	});
});
