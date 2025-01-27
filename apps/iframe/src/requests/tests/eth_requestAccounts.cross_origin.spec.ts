import { addressFactory } from "@happy.tech/testing"
import { AuthState } from "@happy.tech/wallet-common"
import type { HappyUser } from "@happy.tech/wallet-common"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { clearPermissions, getAllPermissions, grantPermissions } from "#src/state/permissions.ts"
import { setAuthState } from "../../state/authState"
import { setUser } from "../../state/user"
import { createHappyUserFromWallet } from "../../utils/createHappyUserFromWallet"
// import { dispatchHandlers } from "../permissionless"

const {
    appURL,
    // parentID,
    appURLMock,
    requestUtilsMock,
} = await vi //
    .hoisted(async () => await import("#src/testing/cross_origin.mocks"))

vi.mock(import("#src/utils/appURL"), appURLMock)
vi.mock(import("#src/requests/utils"), requestUtilsMock)

describe("#publicClient #eth_requestAccounts #cross_origin ", () => {
    describe("disconnected user", () => {
        beforeEach(() => {
            clearPermissions()
            // logout
            setUser(undefined)
            setAuthState(AuthState.Disconnected)
        })

        test("skips eth_requestAccounts permissions when no user", async () => {
            expect(getAllPermissions(appURL).length).toBe(0)
            // const request = makePayload(parentID, { method: "eth_requestAccounts" })
            // expect(dispatchHandlers(request)).rejects.toThrow(EIP1193UnauthorizedError)
        })
    })

    describe("connected user", () => {
        let user: HappyUser

        beforeEach(async () => {
            clearPermissions()
            user = await createHappyUserFromWallet("io.testing", addressFactory())
            setUser(user)
            setAuthState(AuthState.Connected)
        })

        test("throws exception if not previously authorized via popup", async () => {
            expect(getAllPermissions(appURL).length).toBe(0)
            // const request = makePayload(parentID, { method: "eth_requestAccounts" })
            // const response = dispatchHandlers(request)
            // expect(response).rejects.toThrow(EIP1193UserRejectedRequestError)
            expect(getAllPermissions(appURL).length).toBe(0)
        })

        test("returns user accounts if allowed", async () => {
            grantPermissions(appURL, "eth_accounts")
            expect(getAllPermissions(appURL).length).toBe(1)
            // const request = makePayload(parentID, { method: "eth_requestAccounts" })
            // const response = await dispatchHandlers(request)
            // expect(response).toStrictEqual([user.address])
            expect(getAllPermissions(appURL).length).toBe(1)
        })

        test("does not add permissions", async () => {
            const user = await createHappyUserFromWallet("io.testing", addressFactory())
            setUser(user)
            expect(getAllPermissions(appURL).length).toBe(0)
            // const request = makePayload(parentID, { method: "eth_requestAccounts" })
            // await expect(dispatchHandlers(request)).rejects.toThrow(EIP1193UserRejectedRequestError)
            // await expect(dispatchHandlers(request)).rejects.toThrow(EIP1193UserRejectedRequestError)
            expect(getAllPermissions(appURL).length).toBe(0)
        })
    })
})
