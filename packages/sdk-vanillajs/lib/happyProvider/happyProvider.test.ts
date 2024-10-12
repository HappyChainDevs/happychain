import { beforeEach, describe, expect, it, mock } from "bun:test"
import {
    AuthState,
    EventBus,
    EventBusMode,
    type EventBusOptions,
    GenericProviderRpcError,
    Msgs,
    type MsgsFromApp,
    type MsgsFromIframe,
    type ProviderMsgsFromApp,
    type ProviderMsgsFromIframe,
    config,
} from "@happychain/sdk-shared"
import type { RpcBlock } from "viem"
import { createUUID } from "../common-utils"
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

function newIframeProviderBus(options: EventBusOptions) {
    return new EventBus<ProviderMsgsFromApp, ProviderMsgsFromIframe>(options)
}

function newAppProviderBus(options: EventBusOptions) {
    return new EventBus<ProviderMsgsFromIframe, ProviderMsgsFromApp>(options)
}

function newIframeMessageBus(options: EventBusOptions) {
    return new EventBus<MsgsFromApp, MsgsFromIframe>(options)
}

function newAppMessageBus(options: EventBusOptions) {
    return new EventBus<MsgsFromIframe, MsgsFromApp>(options)
}

describe("HappyProvider", () => {
    let providerBusConfig: EventBusOptions
    let appBusConfig: EventBusOptions
    beforeEach(() => {
        providerBusConfig = {
            scope: createUUID(),
            logger: { log: mock(), warn: mock(), error: mock() },
            mode: EventBusMode.Broadcast,
        } satisfies EventBusOptions

        appBusConfig = {
            scope: createUUID(),
            logger: { log: mock(), warn: mock(), error: mock() },
            mode: EventBusMode.Broadcast,
        } satisfies EventBusOptions
    })

    it("transmits payload using bus", async () => {
        const happyProviderBusIframe = newIframeProviderBus(providerBusConfig)
        const appBusIframe = newIframeMessageBus(appBusConfig)
        const uuid = createUUID()

        const provider = new SocialWalletHandler({
            iframePath: config.iframePath,
            windowId: uuid,
            providerBus: newAppProviderBus(providerBusConfig),
            msgBus: newAppMessageBus(appBusConfig),
        })

        const callback = mock(({ key, windowId, error: _error, payload: _payload }) => {
            happyProviderBusIframe.emit(Msgs.RequestResponse, {
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

        void appBusIframe.emit(Msgs.AuthStateChanged, AuthState.Disconnected)

        // auto approve permissions (no popup)
        happyProviderBusIframe.on(Msgs.PermissionCheckRequest, ({ key, windowId: uuid }) => {
            happyProviderBusIframe.emit(Msgs.PermissionCheckResponse, {
                key,
                windowId: uuid,
                error: null,
                payload: false,
            })
        })

        // within iframe
        happyProviderBusIframe.on(Msgs.RequestPermissionless, callback)

        // provider request, unanswered so don't await
        expect(provider.request(payload)).resolves.toStrictEqual(emptyRpcBlock)

        expect(callback).toBeCalledTimes(1)
        expect(callback.mock.calls[0][0].error).toBe(null)
        expect(callback.mock.calls[0][0].key).toBeString()
        expect(callback.mock.calls[0][0].payload).toEqual(payload)
    })

    it("resolves on success", async () => {
        const happyProviderBusIframe = newIframeProviderBus(providerBusConfig)
        const appBusIframe = newIframeMessageBus(appBusConfig)
        const uuid = createUUID()

        const provider = new HappyProvider({
            iframePath: config.iframePath,
            windowId: uuid,
            providerBus: new EventBus(providerBusConfig),
            msgBus: newAppMessageBus(appBusConfig),
        })

        void appBusIframe.emit(Msgs.AuthStateChanged, AuthState.Disconnected)

        // auto approve permissions (no popup)
        happyProviderBusIframe.on(Msgs.PermissionCheckRequest, ({ key, windowId: uuid }) => {
            happyProviderBusIframe.emit(Msgs.PermissionCheckResponse, {
                key,
                windowId: uuid,
                error: null,
                payload: false,
            })
        })

        // within iframe
        happyProviderBusIframe.on(Msgs.RequestPermissionless, ({ key }) => {
            happyProviderBusIframe.emit(Msgs.RequestResponse, {
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
        const happyProviderBusIframe = newIframeProviderBus(providerBusConfig)
        const appBusIframe = newIframeMessageBus(appBusConfig)
        const uuid = createUUID()

        const provider = new HappyProvider({
            iframePath: config.iframePath,
            windowId: uuid,
            providerBus: newAppProviderBus(providerBusConfig),
            msgBus: newAppMessageBus(appBusConfig),
        })

        void appBusIframe.emit(Msgs.AuthStateChanged, AuthState.Disconnected)

        // auto approve permissions (no popup)
        happyProviderBusIframe.on(Msgs.PermissionCheckRequest, ({ key, windowId: uuid }) => {
            happyProviderBusIframe.emit(Msgs.PermissionCheckResponse, {
                key,
                windowId: uuid,
                error: null,
                payload: false,
            })
        })

        // within iframe
        happyProviderBusIframe.on(Msgs.RequestPermissionless, ({ key }) => {
            happyProviderBusIframe.emit(Msgs.RequestResponse, {
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
        const provider = new HappyProvider({
            iframePath: config.iframePath,
            windowId: createUUID(),
            providerBus: newAppProviderBus(providerBusConfig),
            msgBus: newAppMessageBus(appBusConfig),
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
