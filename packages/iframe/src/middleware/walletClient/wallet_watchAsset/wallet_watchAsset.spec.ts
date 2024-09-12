import { AuthState, createUUID } from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, HappyUser, ProviderEventPayload } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai"
import { beforeEach, describe, expect, test } from "vitest"
import { vi } from "vitest"
import { getWatchedAssets } from "../../../services/watchedAssets/utils"
import { authStateAtom } from "../../../state/authState"
import { userAtom } from "../../../state/user"
import { createHappyUserFromWallet } from "../../../utils/createHappyUserFromWallet"
import { walletWatchAssetMiddleware } from "./wallet_watchAsset"

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
    let next: () => Promise<void>

    beforeEach(() => {
        user = createHappyUserFromWallet("io.testing", "0x123456789")
        getDefaultStore().set(userAtom, user)
        getDefaultStore().set(authStateAtom, AuthState.Connected)

        next = vi.fn()
    })

    test("adds token", async () => {
        // Initially, no assets should be watched
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

        // Execute middleware
        const response = await walletWatchAssetMiddleware(request, next)

        // Successful response from middleware
        expect(response).toBe(true)

        // Check if the asset was added
        const userAssets = getWatchedAssets()

        // Access assets for the specific address
        const assetsForAddress = userAssets[user.address]

        // Check that the length of the array for this address is 1
        expect(assetsForAddress.length).toBe(1)
    })
})