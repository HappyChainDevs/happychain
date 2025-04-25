import { addressFactory, makePayload } from "@happy.tech/testing"
import { AuthState } from "@happy.tech/wallet-common"
import type { ApprovedRequestPayload, HappyUser } from "@happy.tech/wallet-common"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { setAuthState } from "#src/state/authState"
import { setUser } from "#src/state/user"
import { getWatchedAssets } from "#src/state/watchedAssets.ts"
import { createHappyUserFromWallet } from "#src/utils/createHappyUserFromWallet"
import { dispatchApprovedRequest } from "../handlers/approved"

const { iframeID, appURLMock } = await vi //
    .hoisted(async () => await import("#src/testing/cross_origin.mocks"))

vi.mock(import("#src/utils/appURL"), appURLMock)

describe("walletClient wallet_watchAsset", () => {
    let user: HappyUser

    beforeEach(async () => {
        user = await createHappyUserFromWallet("io.testing", addressFactory())
        setUser(user)
        setAuthState(AuthState.Connected)
    })

    test("adds token", async () => {
        expect(Object.keys(getWatchedAssets()).length).toBe(0)
        const request = makePayload<ApprovedRequestPayload>(iframeID, {
            eip1193RequestParams: {
                method: "wallet_watchAsset",
                params: {
                    type: "ERC20",
                    options: {
                        address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                        decimals: 18,
                        symbol: "Foo",
                    },
                },
            },
        })
        await dispatchApprovedRequest(request)

        const userAssets = getWatchedAssets()
        const assetsForAddress = userAssets[user.address]
        expect(assetsForAddress.length).toBe(1)

        // add the same token a second time, shouldn't add a new token but also returns true
        // since this isn't an error case
        const reAddTokenReq = await dispatchApprovedRequest(request)
        expect(assetsForAddress.length).toBe(1)
        expect(reAddTokenReq).toBe(true)
    })
})
