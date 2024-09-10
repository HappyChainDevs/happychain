import { createUUID } from "@happychain/sdk-shared"
import type {
    EIP1193RequestParameters,
    ProviderEventPayload,
} from "@happychain/sdk-shared/lib/interfaces/eip1193Provider"
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, test } from "vitest"
import { vi } from "vitest"
import { clearWatchedAssets, getWatchedAssets } from "../../../services/watchedAssets/utils"
import { useWalletWatchAssetMiddleware } from "./wallet_watchAsset"

function makePayload(payload: EIP1193RequestParameters) {
    return {
        key: createUUID(),
        windowId: createUUID(),
        error: null,
        payload,
    } as ProviderEventPayload<EIP1193RequestParameters>
}

describe("walletClient wallet_watchAsset", () => {
    beforeEach(() => {
        clearWatchedAssets()
    })

    test("adds token", async () => {
        const next = vi.fn()

        const { result } = renderHook(() => useWalletWatchAssetMiddleware())

        expect(getWatchedAssets.length).toBe(0)

        const request = makePayload({
            method: "wallet_watchAsset",
            params: {
                type: "ERC20",
                options: {
                    address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                    decimals: 18,
                    symbol: "Foo",
                },
            },
        })

        // execute middleware
        const response = await result.current(request, next)

        // successful repsonse from middleware
        expect(response).toBe(true)

        expect(getWatchedAssets.length).toBe(1)
    })
})
