import { generateTestUser, makePayload } from "@happy.tech/testing"
import { AuthState, EIP1193UnauthorizedError } from "@happy.tech/wallet-common"
import type { HappyUser } from "@happy.tech/wallet-common"
import { beforeEach, describe, expect, test } from "vitest"
import { vi } from "vitest"
import { setAuthState } from "#src/state/authState"
import { clearPermissions, getAllPermissions } from "#src/state/permissions"
import { setUser } from "#src/state/user"
import { disablePermissionWarnings } from "#src/testing/utils"
import { dispatchedPermissionlessRequest } from "../handlers/permissionless"

const { appURL, walletID, appURLMock } = await vi //
    .hoisted(async () => await import("#src/testing/same_origin.mocks"))

vi.mock(import("#src/utils/appURL"), appURLMock)

describe("#publicClient #eth_requestAccounts #same_origin", () => {
    describe("disconnected user", () => {
        disablePermissionWarnings()
        beforeEach(() => {
            clearPermissions()
            // logout
            setUser(undefined)
            setAuthState(AuthState.Disconnected)
        })

        test("skips eth_requestAccounts permissions when no user", async () => {
            expect(getAllPermissions(appURL).length).toBe(0)
            const request = makePayload(walletID, { method: "eth_requestAccounts" })
            await expect(dispatchedPermissionlessRequest(request)).rejects.toThrow(EIP1193UnauthorizedError)
        })
    })

    describe("connected user", () => {
        let user: HappyUser

        beforeEach(async () => {
            clearPermissions()
            user = generateTestUser()
            setUser(user)
            setAuthState(AuthState.Connected)
        })

        test("returns connected user address when requested", async () => {
            expect(getAllPermissions(appURL).length).toBe(1)
            const request = makePayload(walletID, { method: "eth_requestAccounts" })
            const response = await dispatchedPermissionlessRequest(request)
            expect(response).toStrictEqual([user.address])
            expect(getAllPermissions(appURL).length).toBe(1)
        })

        test("does not add permissions", async () => {
            expect(getAllPermissions(appURL).length).toBe(1)
            const request = makePayload(walletID, { method: "eth_requestAccounts" })
            await dispatchedPermissionlessRequest(request)
            await dispatchedPermissionlessRequest(request)
            await dispatchedPermissionlessRequest(request)
            await dispatchedPermissionlessRequest(request)
            expect(getAllPermissions(appURL).length).toBe(1)
        })
    })
})
