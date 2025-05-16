import { generateTestUser, makePayload } from "@happy.tech/testing"
import { AuthState } from "@happy.tech/wallet-common"
import type { HappyUser } from "@happy.tech/wallet-common"
import { beforeEach, describe, expect, test } from "vitest"
import { vi } from "vitest"
import { dispatchApprovedRequest } from "#src/requests/handlers/approved"
import { setAuthState } from "#src/state/authState"
import { clearPermissions, getAllPermissions } from "#src/state/permissions.ts"
import { setUser } from "#src/state/user"

const { appURL, walletID, appURLMock } = await vi //
    .hoisted(async () => await import("#src/testing/same_origin.mocks"))

vi.mock(import("#src/utils/appURL"), appURLMock)

describe("#walletClient #wallet_requestPermissions #same_origin", () => {
    let user: HappyUser

    beforeEach(async () => {
        clearPermissions()
        user = generateTestUser()
        setUser(user)
        setAuthState(AuthState.Connected)
    })

    test("adds eth_account permissions (no caveats)", async () => {
        expect(getAllPermissions(appURL).length).toBe(1)
        const request = makePayload(walletID, {
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: {} }],
        })
        const response = await dispatchApprovedRequest(request)
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

    test("adds eth_account permissions (with caveats)", async () => {
        expect(getAllPermissions(appURL).length).toBe(1)
        const request = makePayload(walletID, {
            method: "wallet_requestPermissions",
            params: [
                {
                    eth_accounts: {
                        requiredMethods: ["signTypedData_v3"],
                    },
                },
            ],
        })
        const response = await dispatchApprovedRequest(request)
        expect(getAllPermissions(appURL)).toStrictEqual(response)
        expect(response).toStrictEqual([
            {
                caveats: [
                    {
                        type: "requiredMethods",
                        value: ["signTypedData_v3"],
                    },
                ],
                id: expect.any(String),
                date: expect.any(Number),
                invoker: appURL,
                parentCapability: "eth_accounts",
            },
        ])
    })

    test("only adds permissions once", async () => {
        expect(getAllPermissions(appURL).length).toBe(1)
        const request = makePayload(walletID, { method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })
        await dispatchApprovedRequest(request)
        await dispatchApprovedRequest(request)
        await dispatchApprovedRequest(request)
        await dispatchApprovedRequest(request)
        expect(getAllPermissions(appURL).length).toBe(1)
    })
})
