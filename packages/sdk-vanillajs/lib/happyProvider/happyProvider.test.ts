import { beforeEach, describe, expect, it, mock } from "bun:test"

import type { EIP1193ProxiedEvents, EventBusOptions, HappyEvents } from "@happychain/sdk-shared"
import { AuthState, EventBus, EventBusChannel, GenericProviderRpcError, config } from "@happychain/sdk-shared"
import type { RpcBlock } from "viem"

import { HappyProvider } from "./happyProvider"
import { SocialWalletHandler } from "./socialWalletHandler"

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
    let providerBusConfig: EventBusOptions
    let dappBusConfig: EventBusOptions
    beforeEach(() => {
        providerBusConfig = {
            scope: crypto.randomUUID(),
            logger: { log: mock(), warn: mock(), error: mock() },
            mode: EventBusChannel.Broadcast,
        } satisfies EventBusOptions

        dappBusConfig = {
            scope: crypto.randomUUID(),
            logger: { log: mock(), warn: mock(), error: mock() },
            mode: EventBusChannel.Broadcast,
        } satisfies EventBusOptions
    })

    it("transmits payload using bus", async () => {
        const happyProviderBusIframe = new EventBus<EIP1193ProxiedEvents>(providerBusConfig)
        const dappBusIframe = new EventBus<HappyEvents>(dappBusConfig)
        const uuid = crypto.randomUUID()

        const provider = new SocialWalletHandler({
            iframePath: config.iframePath,
            windowId: uuid,
            providerBus: new EventBus<EIP1193ProxiedEvents>(providerBusConfig),
            dappBus: new EventBus<HappyEvents>(dappBusConfig),
        })

        const callback = mock(({ key, windowId, error: _error, payload: _payload }) => {
            happyProviderBusIframe.emit("response:complete", {
                key,
                windowId,
                error: null,
                payload: emptyRpcBlock,
            })
        })

        const payload = {
            method: "eth_getBlockByNumber",
            params: ["latest", false],
        } as {
            // make viem happy
            method: "eth_getBlockByNumber"
            params: ["latest", false]
        }

        dappBusIframe.emit("auth-state", AuthState.Disconnected)

        // auto approve permissions (no popup)
        happyProviderBusIframe.on("permission-check:request", ({ key, windowId: uuid }) => {
            happyProviderBusIframe.emit("permission-check:response", {
                key,
                windowId: uuid,
                error: null,
                payload: false,
            })
        })

        // within iframe
        happyProviderBusIframe.on("request:approve", callback)

        // provider request, unanswered so don't await
        expect(provider.request(payload)).resolves.toStrictEqual(emptyRpcBlock)

        expect(callback).toBeCalledTimes(1)
        expect(callback.mock.calls[0][0].error).toBe(null)
        expect(callback.mock.calls[0][0].key).toBeString()
        expect(callback.mock.calls[0][0].payload).toEqual(payload)
    })

    it("resolves on success", async () => {
        const happyProviderBusIframe = new EventBus<EIP1193ProxiedEvents>(providerBusConfig)
        const dappBusIframe = new EventBus<HappyEvents>(dappBusConfig)
        const uuid = crypto.randomUUID()

        const provider = new HappyProvider({
            iframePath: config.iframePath,
            windowId: uuid,
            providerBus: new EventBus<EIP1193ProxiedEvents>(providerBusConfig),
            dappBus: new EventBus<HappyEvents>(dappBusConfig),
        })

        dappBusIframe.emit("auth-state", AuthState.Disconnected)

        // auto approve permissions (no popup)
        happyProviderBusIframe.on("permission-check:request", ({ key, windowId: uuid }) => {
            happyProviderBusIframe.emit("permission-check:response", {
                key,
                windowId: uuid,
                error: null,
                payload: false,
            })
        })

        // within iframe
        happyProviderBusIframe.on("request:approve", ({ key }) => {
            happyProviderBusIframe.emit("response:complete", {
                key,
                windowId: uuid,
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
        const happyProviderBusIframe = new EventBus<EIP1193ProxiedEvents>(providerBusConfig)
        const dappBusIframe = new EventBus<HappyEvents>(dappBusConfig)
        const uuid = crypto.randomUUID()

        const provider = new HappyProvider({
            iframePath: config.iframePath,
            windowId: uuid,
            providerBus: new EventBus<EIP1193ProxiedEvents>(providerBusConfig),
            dappBus: new EventBus<HappyEvents>(dappBusConfig),
        })

        dappBusIframe.emit("auth-state", AuthState.Disconnected)

        // auto approve permissions (no popup)
        happyProviderBusIframe.on("permission-check:request", ({ key, windowId: uuid }) => {
            happyProviderBusIframe.emit("permission-check:response", {
                key,
                windowId: uuid,
                error: null,
                payload: false,
            })
        })

        // within iframe
        happyProviderBusIframe.on("request:approve", ({ key }) => {
            happyProviderBusIframe.emit("response:complete", {
                key,
                windowId: uuid,
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
        const dappBusIframe = new EventBus<HappyEvents>(dappBusConfig)

        const provider = new HappyProvider({
            iframePath: config.iframePath,
            windowId: crypto.randomUUID(),
            providerBus: new EventBus<EIP1193ProxiedEvents>(providerBusConfig),
            dappBus: new EventBus<HappyEvents>(dappBusConfig),
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
