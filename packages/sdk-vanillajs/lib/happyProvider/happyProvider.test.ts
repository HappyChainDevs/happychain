import { beforeEach, describe, expect, it, mock } from "bun:test"
import { type UUID, createUUID } from "@happychain/common"
import {
    AuthState,
    EIP1193ErrorCodes,
    type EIP1193RequestParameters,
    EventBus,
    EventBusMode,
    type EventBusOptions,
    GenericProviderRpcError,
    Msgs,
    type MsgsFromApp,
    type MsgsFromIframe,
    type ProviderMsgsFromApp,
    type ProviderMsgsFromIframe,
    getEIP1193ErrorObjectFromCode,
} from "@happychain/sdk-shared"
import type { RpcBlock } from "viem"
import { config } from "../config"
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

function newIframeMessageBus(options: EventBusOptions) {
    return new EventBus<MsgsFromApp, MsgsFromIframe>(options)
}

function newAppProviderBus(options: EventBusOptions) {
    return new EventBus<ProviderMsgsFromIframe, ProviderMsgsFromApp>(options)
}

function newAppMessageBus(options: EventBusOptions) {
    return new EventBus<MsgsFromIframe, MsgsFromApp>(options)
}

function createTestBusPair() {
    const mc1 = new MessageChannel()
    const scope = createUUID()
    return [
        {
            scope,
            logger: { log: mock(), warn: mock(), error: mock() },
            mode: EventBusMode.Forced,
            port: mc1.port1,
        },
        {
            scope,
            logger: { log: mock(), warn: mock(), error: mock() },
            mode: EventBusMode.Forced,
            port: mc1.port2,
        },
    ] as [EventBusOptions, EventBusOptions]
}

describe("HappyProvider", () => {
    let iframeProviderBus: ReturnType<typeof newIframeProviderBus>
    let iframeMessageBus: ReturnType<typeof newIframeMessageBus>
    let appProviderBus: ReturnType<typeof newAppProviderBus>
    let appMessageBus: ReturnType<typeof newAppMessageBus>

    let windowId: UUID

    let provider: HappyProvider

    function test_autoApprovePermissionCheck() {
        // auto approve permissions (no popup)
        iframeProviderBus.on(Msgs.PermissionCheckRequest, ({ key, windowId: uuid }) => {
            iframeProviderBus.emit(Msgs.PermissionCheckResponse, {
                key,
                windowId: uuid,
                error: null,
                payload: false,
            })
        })
    }
    beforeEach(() => {
        // busses

        const [iframeProviderBusConfig, appProviderBusConfig] = createTestBusPair()
        const [iframeMessageBusConfig, appMessageBusConfig] = createTestBusPair()

        iframeProviderBus = newIframeProviderBus(iframeProviderBusConfig)
        iframeMessageBus = newIframeMessageBus(iframeMessageBusConfig)

        appProviderBus = newAppProviderBus(appProviderBusConfig)
        appMessageBus = newAppMessageBus(appMessageBusConfig)

        windowId = createUUID()

        provider = new HappyProvider({
            iframePath: config.iframePath,
            windowId: windowId,
            providerBus: appProviderBus,
            msgBus: appMessageBus,
        })
    })

    it("transmits payload using bus", async () => {
        // provider setup
        void iframeMessageBus.emit(Msgs.IframeInit, true)
        test_autoApprovePermissionCheck()
        void iframeMessageBus.emit(Msgs.AuthStateChanged, AuthState.Disconnected)

        // auto approve & respond to request from iframe
        const callback = mock(({ key, windowId, error: _error, payload: _payload }) => {
            iframeProviderBus.emit(Msgs.RequestResponse, {
                key,
                windowId,
                error: null,
                payload: emptyRpcBlock,
            })
        })

        const payload: EIP1193RequestParameters = {
            method: "eth_getBlockByNumber",
            params: ["latest", false],
        }

        // within iframe
        iframeProviderBus.on(Msgs.RequestPermissionless, callback)

        // provider request, unanswered so don't await
        expect(provider.request(payload)).resolves.toStrictEqual(emptyRpcBlock)

        expect(callback).toBeCalledTimes(1)
        expect(callback.mock.calls[0][0].error).toBe(null)
        expect(callback.mock.calls[0][0].key).toBeString()
        expect(callback.mock.calls[0][0].payload).toEqual(payload)
    })

    it("resolves on success", async () => {
        // provider setup
        void iframeMessageBus.emit(Msgs.IframeInit, true)
        test_autoApprovePermissionCheck()
        void iframeMessageBus.emit(Msgs.AuthStateChanged, AuthState.Disconnected)

        // within iframe
        iframeProviderBus.on(Msgs.RequestPermissionless, ({ key, windowId: uuid }) => {
            iframeProviderBus.emit(Msgs.RequestResponse, {
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
        // provider setup
        void iframeMessageBus.emit(Msgs.IframeInit, true)
        test_autoApprovePermissionCheck()
        void iframeMessageBus.emit(Msgs.AuthStateChanged, AuthState.Disconnected)

        // user rejects the request
        iframeProviderBus.on(Msgs.RequestPermissionless, ({ key, windowId: uuid }) => {
            iframeProviderBus.emit(Msgs.RequestResponse, {
                key,
                windowId: uuid,
                error: getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.UserRejectedRequest),
                payload: null,
            })
        })

        // provider request
        const request = provider.request({
            method: "eth_getBlockByNumber",
            params: ["latest", false],
        })
        expect(request).rejects.toThrowError(GenericProviderRpcError)
    })

    it("subscribes and unsubscribes to native eip1193 events", async () => {
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
