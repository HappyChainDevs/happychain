import { createUUID } from "@happychain/common"
import { AuthState } from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, HappyUser, ProviderEventPayload } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai"
import { beforeEach, describe, expect, test } from "vitest"
import { getWatchedAssets } from "../../services/watchedAssets/utils"
import { authStateAtom } from "../../state/authState"
import { userAtom } from "../../state/user"
import { createHappyUserFromWallet } from "../../utils/createHappyUserFromWallet"
import { dispatchHandlers } from "../approved"

function makePayload(payload: EIP1193RequestParameters) {
    return {
        key: createUUID(),
        windowId: createUUID(),
        error: null,
        payload,
    } as ProviderEventPayload<EIP1193RequestParameters>
}

describe("walletClient wallet_watchAsset", () => {
    let user: HappyUser

    beforeEach(() => {
        user = createHappyUserFromWallet("io.testing", "0x123456789")
        getDefaultStore().set(userAtom, user)
        getDefaultStore().set(authStateAtom, AuthState.Connected)
    })

    test("adds token", async () => {
        expect(Object.keys(getWatchedAssets()).length).toBe(0)
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
        const response = await dispatchHandlers(request)
        expect(response).toBe(true)
        const userAssets = getWatchedAssets()
        const assetsForAddress = userAssets[user.address]
        expect(assetsForAddress.length).toBe(1)
    })
})
