import { type UUID, createUUID } from "@happychain/common"
import { AuthState } from "@happychain/sdk-shared"
import type { HappyUser } from "@happychain/sdk-shared"
import { addressFactory, makePayload } from "@happychain/testing"
import { getDefaultStore } from "jotai"
import { beforeEach, describe, expect, test } from "vitest"
import { vi } from "vitest"
import { getWatchedAssets } from "../../services/watchedAssets/utils"
import { authStateAtom } from "../../state/authState"
import { userAtom } from "../../state/user"
import { createHappyUserFromWallet } from "../../utils/createHappyUserFromWallet"
import { dispatchHandlers } from "../approved"

vi.mock("../../utils/getDappOrigin", async () => ({
    getDappOrigin: () => "http://localhost:5160",
    getIframeOrigin: () => "http://localhost:5160",
}))

const parentID = createUUID()
const iframeID = createUUID()
vi.mock("../utils", (importUtils) =>
    importUtils<typeof import("../utils")>().then((utils) => ({
        ...utils,
        confirmSourceId: (sourceId: UUID) => sourceId === parentID || sourceId === iframeID,
        confirmParentId: (sourceId: UUID) => sourceId === parentID,
        confirmIframeId: (sourceId: UUID) => sourceId === iframeID,
    })),
)

describe("walletClient wallet_watchAsset", () => {
    let user: HappyUser

    beforeEach(() => {
        user = createHappyUserFromWallet("io.testing", addressFactory())
        getDefaultStore().set(userAtom, user)
        getDefaultStore().set(authStateAtom, AuthState.Connected)
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
