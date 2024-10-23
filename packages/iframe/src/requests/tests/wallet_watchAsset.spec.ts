import { AuthState } from "@happychain/sdk-shared"
import type { HappyUser } from "@happychain/sdk-shared"
import { addressFactory, makePayload } from "@happychain/testing"
import { beforeEach, describe, expect, test, vi } from "vitest"

import { getWatchedAssets } from "#src/state/watchedAssets.ts"
import { setAuthState } from "../../state/authState"
import { setUser } from "../../state/user"
import { createHappyUserFromWallet } from "../../utils/createHappyUserFromWallet"
import { dispatchHandlers } from "../approved"

const { iframeID, appURLMock, requestUtilsMock } = await vi //
    .hoisted(async () => await import("#src/testing/cross_origin.mocks"))

vi.mock(import("#src/utils/appURL"), appURLMock)
vi.mock(import("#src/requests/utils"), requestUtilsMock)

describe("walletClient wallet_watchAsset", () => {
    let user: HappyUser

    beforeEach(() => {
        user = createHappyUserFromWallet("io.testing", addressFactory())
        setUser(user)
        setAuthState(AuthState.Connected)
    })

    test("adds token", async () => {
        expect(Object.keys(getWatchedAssets()).length).toBe(0)
        const request = makePayload(iframeID, {
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
        const response = await dispatchHandlers(request)
        expect(response).toBe(true)
        const userAssets = getWatchedAssets()
        const assetsForAddress = userAssets[user.address]
        expect(assetsForAddress.length).toBe(1)
    })
})
