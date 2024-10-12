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

const originDapp = "http://localhost:1234"
const originIframe = "http://localhost:4321"
vi.mock("../../utils/getDappOrigin", async () => ({
    getDappOrigin: () => originDapp,
    getIframeOrigin: () => originIframe,
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
describe("#walletClient #wallet_requestPermissions #cross_origin", () => {
    let user: HappyUser

    beforeEach(() => {
        clearPermissions()
        user = createHappyUserFromWallet("io.testing", addressFactory())
        getDefaultStore().set(userAtom, user)
        getDefaultStore().set(authStateAtom, AuthState.Connected)
    })

    test("adds eth_account permissions", async () => {
        expect(getAllPermissions({ origin: originDapp }).length).toBe(0)
        expect(getAllPermissions({ origin: originIframe }).length).toBe(1)
        const request = makePayload(parentID, { method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })
        const response = await dispatchHandlers(request)
        expect(getAllPermissions({ origin: originDapp }).length).toBe(1)
        expect(getAllPermissions({ origin: originIframe }).length).toBe(1)
        expect(getAllPermissions({ origin: originDapp })).toStrictEqual(response)
        expect(response).toStrictEqual([
            {
                caveats: [],
                id: expect.any(String),
                date: expect.any(Number),
                invoker: originDapp,
                parentCapability: "eth_accounts",
            },
        ])
    })

    test("throws error on caveat use", async () => {
        expect(getAllPermissions({ origin: originDapp }).length).toBe(0)
        expect(getAllPermissions({ origin: originIframe }).length).toBe(1)
        const request = makePayload(parentID, {
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: { requiredMethods: ["signTypedData_v3"] } }],
        })
        expect(dispatchHandlers(request)).rejects.toThrow("WalletPermissionCaveats Not Yet Supported")
    })

    test("only adds permissions once", async () => {
        expect(getAllPermissions({ origin: originDapp }).length).toBe(0)
        expect(getAllPermissions({ origin: originIframe }).length).toBe(1)
        const request = makePayload(parentID, { method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })
        await dispatchHandlers(request)
        await dispatchHandlers(request)
        await dispatchHandlers(request)
        await dispatchHandlers(request)
        expect(getAllPermissions({ origin: originDapp }).length).toBe(1)
        expect(getAllPermissions({ origin: originIframe }).length).toBe(1)
    })
})
