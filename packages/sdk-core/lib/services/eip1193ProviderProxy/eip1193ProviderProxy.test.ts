import { beforeEach, describe, expect, it, mock } from "bun:test";
import { setTimeout } from "node:timers/promises";
import type { RpcBlock } from "viem";
import { config } from "../../config";
import { EventBusChannel, type EventBusOptions, eventBus } from "../eventBus";
import { EIP1193ProviderProxy } from "./eip1193ProviderProxy";
import { GenericProviderRpcError } from "./errors";
import type { EIP1193ProxiedEvents } from "./events";

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
		const iframeBus = eventBus<EIP1193ProxiedEvents>(busConfig);
		const providerProxyBus = eventBus<EIP1193ProxiedEvents>(busConfig);

		const provider = new EIP1193ProviderProxy(providerProxyBus, config);

		const callback = mock(({ key, error, payload }) => {});

		const payload = {
			method: "eth_getBlockByNumber",
			params: ["latest", false],
		} as {
			// make viem happy
			method: "eth_getBlockByNumber";
			params: ["latest", false];
		};

		// within iframe
		iframeBus.on("request:approve", callback);

		// provider request, unanswered so don't await
		provider.request(payload);

		await setTimeout(0);

		expect(callback).toBeCalledTimes(1);
		expect(callback.mock.calls[0][0].error).toBe(null);
		expect(callback.mock.calls[0][0].key).toBeString();
		expect(callback.mock.calls[0][0].payload).toEqual(payload);
	});

	it("resolves on success", async () => {
		const iframeBus = eventBus<EIP1193ProxiedEvents>(busConfig);
		const providerProxyBus = eventBus<EIP1193ProxiedEvents>(busConfig);

		const provider = new EIP1193ProviderProxy(providerProxyBus, config);

		const emptyBlock = {
			baseFeePerGas: null,
			blobGasUsed: "0x",
			difficulty: "0x",
			excessBlobGas: "0x",
			extraData: "0x",
			gasLimit: "0x",
			gasUsed: "0x",
			hash: null,
			logsBloom: null,
			miner: "0x",
			mixHash: "0x",
			nonce: null,
			number: null,
			parentHash: "0x",
			receiptsRoot: "0x",
			sealFields: [],
			sha3Uncles: "0x",
			size: "0x",
			stateRoot: "0x",
			timestamp: "0x",
			totalDifficulty: "0x",
			transactions: [],
			transactionsRoot: "0x",
			uncles: [],
		} satisfies RpcBlock;

		// within iframe
		iframeBus.on("request:approve", ({ key }) => {
			iframeBus.emit("provider:request:complete", {
				key,
				error: null,
				payload: emptyBlock,
			});
		});

		// provider request
		expect(
			provider.request({
				method: "eth_getBlockByNumber",
				params: ["latest", false],
			}),
		).resolves.toBe(emptyBlock);
	});

	it("rejects on error", async () => {
		const iframeBus = eventBus<EIP1193ProxiedEvents>(busConfig);
		const providerProxyBus = eventBus<EIP1193ProxiedEvents>(busConfig);

		const provider = new EIP1193ProviderProxy(providerProxyBus, config);

		// within iframe
		iframeBus.on("request:approve", ({ key }) => {
			iframeBus.emit("provider:request:complete", {
				key,
				error: { code: 4001, message: "User Rejected", data: "User Rejected " },
				payload: null,
			});
		});

		// provider request
		expect(
			provider.request({
				method: "eth_getBlockByNumber",
				params: ["latest", false],
			}),
		).rejects.toThrowError(GenericProviderRpcError);
	});

	it("subscribes and unsubscribes to native eip1193 events", async () => {
		const providerProxyBus = eventBus<EIP1193ProxiedEvents>(busConfig);

		const provider = new EIP1193ProviderProxy(providerProxyBus, config);

		const callback = mock(() => {});
		provider.on("connect", callback);

		provider.emit("connect");

		expect(callback).toHaveBeenCalledTimes(1);

		provider.removeListener("connect", callback);

		provider.emit("connect");
		provider.emit("connect");
		provider.emit("connect");

		expect(callback).toHaveBeenCalledTimes(1);
	});
});
