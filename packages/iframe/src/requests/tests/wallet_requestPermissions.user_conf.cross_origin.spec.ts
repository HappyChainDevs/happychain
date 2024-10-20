import { AuthState } from "@happychain/sdk-shared"
import type { HappyUser } from "@happychain/sdk-shared"
import { addressFactory, makePayload } from "@happychain/testing"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { clearPermissions, getAllPermissions } from "#src/services/permissions"
import { setAuthState } from "#src/state/authState"
import { setUser } from "#src/state/user"
import { createHappyUserFromWallet } from "#src/utils/createHappyUserFromWallet"
import { dispatchHandlers } from "../approved"

const { appURL, iframeURL, parentID, appURLMock, requestUtilsMock } = await vi //
    .hoisted(async () => await import("#src/testing/cross_origin.mocks"))

vi.mock(import("#src/utils/appURL"), appURLMock)
vi.mock(import("#src/requests/utils"), requestUtilsMock)

describe("#walletClient #wallet_requestPermissions #cross_origin", () => {
    let user: HappyUser

    beforeEach(() => {
        clearPermissions()
        user = createHappyUserFromWallet("io.testing", addressFactory())
        setUser(user)
        setAuthState(AuthState.Connected)
    })

    test("adds eth_account permissions", async () => {
        expect(getAllPermissions(appURL).length).toBe(0)
        expect(getAllPermissions(iframeURL).length).toBe(1)
        const request = makePayload(parentID, { method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })
        const response = await dispatchHandlers(request)
        expect(getAllPermissions(appURL).length).toBe(1)
        expect(getAllPermissions(iframeURL).length).toBe(1)
        expect(getAllPermissions(appURL)).toStrictEqual(response)
        expect(response).toStrictEqual([
            {
                caveats: [],
                id: expect.any(String),
                date: expect.any(Number),
                invoker: appURL,
                parentCapability: "eth_accounts",
            },
        ])
    })

    test("throws error on caveat use", async () => {
        expect(getAllPermissions(appURL).length).toBe(0)
        expect(getAllPermissions(iframeURL).length).toBe(1)
        const request = makePayload(parentID, {
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: { requiredMethods: ["signTypedData_v3"] } }],
        })
        expect(dispatchHandlers(request)).rejects.toThrow("Wallet permission caveats not yet supported")
    })

    test("only adds permissions once", async () => {
        expect(getAllPermissions(appURL).length).toBe(0)
        expect(getAllPermissions(iframeURL).length).toBe(1)
        const request = makePayload(parentID, { method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })
        await dispatchHandlers(request)
        await dispatchHandlers(request)
        await dispatchHandlers(request)
        await dispatchHandlers(request)
        expect(getAllPermissions(appURL).length).toBe(1)
        expect(getAllPermissions(iframeURL).length).toBe(1)
    })
})
