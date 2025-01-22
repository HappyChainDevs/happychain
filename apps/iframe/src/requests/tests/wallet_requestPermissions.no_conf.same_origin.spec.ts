import { addressFactory, makePayload } from "@happy.tech/testing"
import { AuthState, EIP1193UnauthorizedError } from "@happy.tech/wallet-common"
import type { HappyUser } from "@happy.tech/wallet-common"
import { beforeEach, describe, expect, test } from "vitest"
import { vi } from "vitest"
import { clearPermissions, getAllPermissions } from "#src/state/permissions.ts"
import { setAuthState } from "../../state/authState"
import { setUser } from "../../state/user"
import { createHappyUserFromWallet } from "../../utils/createHappyUserFromWallet"
import { dispatchHandlers } from "../permissionless"

const { appURL, iframeID, appURLMock, requestUtilsMock } = await vi //
    .hoisted(async () => await import("#src/testing/same_origin.mocks"))

vi.mock(import("#src/utils/appURL"), appURLMock)
vi.mock(import("#src/requests/utils"), requestUtilsMock)

describe("#publicClient #wallet_requestPermissions #same_origin", () => {
    describe("disconnected user", () => {
        beforeEach(() => {
            clearPermissions()
            // logout
            setUser(undefined)
            setAuthState(AuthState.Disconnected)
        })

        test("skips wallet_requestPermissions permissions when no user", async () => {
            expect(getAllPermissions(appURL).length).toBe(0)
            const request = makePayload(iframeID, {
                method: "wallet_requestPermissions",
                params: [{ eth_accounts: {} }],
            })
            expect(dispatchHandlers(request)).rejects.toThrow(EIP1193UnauthorizedError)
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

        test("does not add permissions", async () => {
            expect(getAllPermissions(appURL).length).toBe(1)
            const request = makePayload(iframeID, {
                method: "wallet_requestPermissions",
                params: [{ eth_accounts: {} }],
            })
            await dispatchHandlers(request)
            await dispatchHandlers(request)
            await dispatchHandlers(request)
            await dispatchHandlers(request)
            expect(getAllPermissions(appURL).length).toBe(1)
        })
    })
})
