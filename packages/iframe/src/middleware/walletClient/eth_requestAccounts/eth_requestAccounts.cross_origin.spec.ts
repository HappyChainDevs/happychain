import { AuthState, createUUID } from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, HappyUser, ProviderEventPayload } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai"
import { beforeEach, describe, expect, test } from "vitest"
import { vi } from "vitest"
import { clearPermissions, getPermissions } from "../../../services/permissions"
import { authStateAtom } from "../../../state/authState"
import { userAtom } from "../../../state/user"
import { createHappyUserFromWallet } from "../../../utils/createHappyUserFromWallet"
import { ethRequestAccountsMiddleware } from "./eth_requestAccounts"

function makePayload(payload: EIP1193RequestParameters) {
    return {
        key: createUUID(),
        windowId: createUUID(),
        error: null,
        payload,
    } as ProviderEventPayload<EIP1193RequestParameters>
}

vi.mock("../../../utils/getDappOrigin", async () => ({
    getDappOrigin: () => "http://localhost:5173",
    getIframeOrigin: () => "http://localhost:5160",
}))

describe("#walletClient #eth_requestAccounts #cross_origin", () => {
    describe("disconnected user", () => {
        let next: () => Promise<void>

        beforeEach(() => {
            // clear permissions, logout
            clearPermissions()
            getDefaultStore().set(userAtom, undefined)
            getDefaultStore().set(authStateAtom, AuthState.Disconnected)

            next = vi.fn()
        })

        test("skips eth_requestAccounts permissions when no user", async () => {
            expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)

            const request = makePayload({ method: "eth_requestAccounts" })

            // execute middleware
            const response = await ethRequestAccountsMiddleware(request, next)
            expect(response).toStrictEqual([])

            expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)
        })
    })

    describe("connected user", () => {
        let user: HappyUser
        let next: () => Promise<void>

        beforeEach(() => {
            clearPermissions()

            user = createHappyUserFromWallet("io.testing", "0x123456789")
            getDefaultStore().set(userAtom, user)
            getDefaultStore().set(authStateAtom, AuthState.Connected)

            next = vi.fn()
        })

        test("adds eth_requestAccounts permissions when user", async () => {
            expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)

            const request = makePayload({ method: "eth_requestAccounts" })

            // execute middleware
            const response = await ethRequestAccountsMiddleware(request, next)
            expect(response).toStrictEqual(user.addresses)
            expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(1)
        })

        test("only adds permissions once", async () => {
            expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)

            const request = makePayload({ method: "eth_requestAccounts" })

            // execute middleware
            await ethRequestAccountsMiddleware(request, next)
            await ethRequestAccountsMiddleware(request, next)
            await ethRequestAccountsMiddleware(request, next)
            await ethRequestAccountsMiddleware(request, next)

            expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(1)
        })
    })
})
