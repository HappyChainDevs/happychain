import { type UUID, createUUID } from "@happychain/common"
import { AuthState } from "@happychain/sdk-shared"
import type { HappyUser } from "@happychain/sdk-shared"
import { addressFactory, makePayload } from "@happychain/testing"
import { getDefaultStore } from "jotai"
import { beforeEach, describe, expect, test } from "vitest"
import { vi } from "vitest"
import { clearPermissions, getAllPermissions } from "../../services/permissions"
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
        isAllowedSourceId: (sourceId: UUID) => sourceId === parentID || sourceId === iframeID,
        isParentId: (sourceId: UUID) => sourceId === parentID,
        isIframeId: (sourceId: UUID) => sourceId === iframeID,
    })),
)
describe("#walletClient #wallet_requestPermissions #same_origin", () => {
    let user: HappyUser

    beforeEach(() => {
        clearPermissions()
        user = createHappyUserFromWallet("io.testing", addressFactory())
        getDefaultStore().set(userAtom, user)
        getDefaultStore().set(authStateAtom, AuthState.Connected)
    })

    test("adds eth_account permissions", async () => {
        expect(getAllPermissions().length).toBe(1)
        const request = makePayload(iframeID, { method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })
        const response = await dispatchHandlers(request)
        expect(getAllPermissions()).toStrictEqual(response)
        expect(response).toStrictEqual([
            {
                caveats: [],
                id: expect.any(String),
                date: expect.any(Number),
                invoker: "http://localhost:5160",
                parentCapability: "eth_accounts",
            },
        ])
    })

    test("throws error on caveat use", async () => {
        expect(getAllPermissions().length).toBe(1)
        const request = makePayload(iframeID, {
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: { requiredMethods: ["signTypedData_v3"] } }],
        })
        expect(dispatchHandlers(request)).rejects.toThrow("WalletPermissionCaveats Not Yet Supported")
    })

    test("only adds permissions once", async () => {
        expect(getAllPermissions().length).toBe(1)
        const request = makePayload(iframeID, { method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })
        await dispatchHandlers(request)
        await dispatchHandlers(request)
        await dispatchHandlers(request)
        await dispatchHandlers(request)
        expect(getAllPermissions().length).toBe(1)
    })
})
