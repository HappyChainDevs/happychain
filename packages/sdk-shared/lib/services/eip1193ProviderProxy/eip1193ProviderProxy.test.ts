import { beforeEach, describe, expect, it, mock } from "bun:test"
import { setTimeout } from "node:timers/promises"
import type { RpcBlock } from "viem"

import { config } from "../../config"
import type { HappyEvents } from "../../interfaces/events"
import { EventBus, EventBusChannel, type EventBusOptions } from "../eventBus"

import { GenericProviderRpcError } from "./errors"
import type { EIP1193ProxiedEvents } from "./events"
import { HappyProvider } from "./happyProvider"

const emptyRpcBlock = {
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
} satisfies RpcBlock

describe("HappyProvider", () => {
    let busConfig: EventBusOptions
    beforeEach(() => {
        busConfig = {
            scope: crypto.randomUUID(),
            logger: { log: mock(), warn: mock(), error: mock() },
            mode: EventBusChannel.Broadcast,
        } satisfies EventBusOptions
    })

    it("transmits payload using bus", async () => {
        const happyProviderBusIframe = new EventBus<EIP1193ProxiedEvents>(busConfig)
        const happyProviderBusProviderProxy = new EventBus<EIP1193ProxiedEvents>(busConfig)
        const uuid = crypto.randomUUID()

        const provider = new HappyProvider({
            iframePath: config.iframePath,
            uuid,
            providerBus: happyProviderBusProviderProxy,
            dappBus: new EventBus<HappyEvents>({
                mode: EventBusChannel.Forced,
                scope: crypto.randomUUID(),
                port: new BroadcastChannel("dapp-channel"),
            }),
        })

        const callback = mock(({ key: _key, uuid: _uuid, error: _error, payload: _payload }) => {})

        const payload = {
            method: "eth_getBlockByNumber",
            params: ["latest", false],
        } as {
            // make viem happy
            method: "eth_getBlockByNumber"
            params: ["latest", false]
        }

        // within iframe
        happyProviderBusIframe.on("request:approve", callback)

        // provider request, unanswered so don't await
        provider.request(payload)

        await setTimeout(0)

        expect(callback).toBeCalledTimes(1)
        expect(callback.mock.calls[0][0].error).toBe(null)
        expect(callback.mock.calls[0][0].key).toBeString()
        expect(callback.mock.calls[0][0].payload).toEqual(payload)
    })

    it("resolves on success", async () => {
        const happyProviderBusIframe = new EventBus<EIP1193ProxiedEvents>(busConfig)
        const happyProviderBusProviderProxy = new EventBus<EIP1193ProxiedEvents>(busConfig)
        const uuid = crypto.randomUUID()

        const provider = new HappyProvider({
            iframePath: config.iframePath,
            uuid,
            providerBus: happyProviderBusProviderProxy,
            dappBus: new EventBus<HappyEvents>({
                mode: EventBusChannel.Forced,
                scope: crypto.randomUUID(),
                port: new BroadcastChannel("dapp-channel"),
            }),
        })

        // within iframe
        happyProviderBusIframe.on("request:approve", ({ key }) => {
            happyProviderBusIframe.emit("response:complete", {
                key,
                uuid,
                error: null,
                payload: emptyRpcBlock,
            })
        })

        const resultBlock = provider.request({
            method: "eth_getBlockByNumber",
            params: ["latest", false],
        })
        // provider request
        expect(resultBlock).resolves.toStrictEqual(emptyRpcBlock)
    })

    it("rejects on error", async () => {
        const happyProviderBusIframe = new EventBus<EIP1193ProxiedEvents>(busConfig)
        const happyProviderBusProviderProxy = new EventBus<EIP1193ProxiedEvents>(busConfig)
        const uuid = crypto.randomUUID()

        const provider = new HappyProvider({
            iframePath: config.iframePath,
            uuid,
            providerBus: happyProviderBusProviderProxy,
            dappBus: new EventBus<HappyEvents>({
                mode: EventBusChannel.Forced,
                scope: crypto.randomUUID(),
                port: new BroadcastChannel("dapp-channel"),
            }),
        })

        // within iframe
        happyProviderBusIframe.on("request:approve", ({ key }) => {
            happyProviderBusIframe.emit("response:complete", {
                key,
                uuid,
                error: {
                    code: 4001,
                    message: "User Rejected",
                    data: "User Rejected ",
                },
                payload: null,
            })
        })

        // provider request
        expect(
            provider.request({
                method: "eth_getBlockByNumber",
                params: ["latest", false],
            }),
        ).rejects.toThrowError(GenericProviderRpcError)
    })

    it("subscribes and unsubscribes to native eip1193 events", async () => {
        const happyProviderBusProviderProxy = new EventBus<EIP1193ProxiedEvents>(busConfig)
        const uuid = crypto.randomUUID()

        const provider = new HappyProvider({
            iframePath: config.iframePath,
            uuid,
            providerBus: happyProviderBusProviderProxy,
            dappBus: new EventBus<HappyEvents>({
                mode: EventBusChannel.Forced,
                scope: crypto.randomUUID(),
                port: new BroadcastChannel("dapp-channel"),
            }),
        })

        const callback = mock(() => {})
        provider.on("connect", callback)

        provider.emit("connect")

        expect(callback).toHaveBeenCalledTimes(1)

        provider.removeListener("connect", callback)

        provider.emit("connect")
        provider.emit("connect")
        provider.emit("connect")

        expect(callback).toHaveBeenCalledTimes(1)
    })
})
