import { beforeEach, describe, expect, it, mock } from "bun:test";
import { setTimeout } from "node:timers/promises";
import { config } from "../../config";
import { EventBusChannel, type EventBusOptions, eventBus } from "../eventBus";
import { EIP1193ProviderProxy } from "./eip1193ProviderProxy";
import { ProviderRpcError } from "./errors";

describe("EIP1193ProviderProxy", () => {
	let busConfig: EventBusOptions;
	beforeEach(() => {
		busConfig = {
			scope: crypto.randomUUID(),
			logger: { log: mock(), warn: mock(), error: mock() },
			mode: EventBusChannel.Broadcast,
		} satisfies EventBusOptions;
	});

	it("transmits payload using bus", async () => {
		const recieverBus = eventBus(busConfig);
		const providerBus = eventBus(busConfig);

		const provider = new EIP1193ProviderProxy(providerBus, config);

		const callback = mock(({ key, error, payload }) => {});
		const payload = {
			method: "eth_getBlockByNumber",
			params: ["latest", false],
		};

		// within iframe
		recieverBus.on("request:approve", callback);

		// provider request, unanswered so don't await
		provider.request(payload);

		await setTimeout(0);

		expect(callback).toBeCalledTimes(1);
		expect(callback.mock.calls[0][0].error).toBe(null);
		expect(callback.mock.calls[0][0].key).toBeString();
		expect(callback.mock.calls[0][0].payload).toEqual(payload);
	});

	it("resolves on success", async () => {
		const recieverBus = eventBus(busConfig);
		const providerBus = eventBus(busConfig);

		const provider = new EIP1193ProviderProxy(providerBus, config);
		const callback = mock(({ key }) => {
			recieverBus.emit("provider:request:complete", {
				key,
				error: null,
				payload: "0x1234",
			});
		});

		const payload = {
			method: "eth_getBlockByNumber",
			params: ["latest", false],
		};

		// within iframe
		recieverBus.on("request:approve", callback);

		// provider request
		expect(provider.request(payload)).resolves.toBe("0x1234");
	});

	it("rejects on error", async () => {
		const recieverBus = eventBus(busConfig);
		const providerBus = eventBus(busConfig);

		const provider = new EIP1193ProviderProxy(providerBus, config);
		const callback = mock(({ key }) => {
			recieverBus.emit("provider:request:complete", {
				key,
				error: { code: 4001, message: "User Rejected", data: "User Rejected " },
				payload: null,
			});
		});

		const payload = {
			method: "eth_getBlockByNumber",
			params: ["latest", false],
		};

		// within iframe
		recieverBus.on("request:approve", callback);

		// provider request
		expect(provider.request(payload)).rejects.toThrowError(ProviderRpcError);
	});

	it("subscribe an unsubscribe", async () => {
		const providerBus = eventBus(busConfig);

		const provider = new EIP1193ProviderProxy(providerBus, config);
		const off = provider.on("connect", () => {});
	});
});
