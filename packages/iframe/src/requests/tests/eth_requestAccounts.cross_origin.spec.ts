import { AuthState, createUUID } from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, HappyUser, ProviderEventPayload } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai"
import { UnauthorizedProviderError } from "viem"
import { beforeEach, describe, expect, test } from "vitest"
import { vi } from "vitest"
import { clearPermissions, getAllPermissions, grantPermissions } from "../../services/permissions.ts"
import { authStateAtom } from "../../state/authState.ts"
import { userAtom } from "../../state/user.ts"
import { createHappyUserFromWallet } from "../../utils/createHappyUserFromWallet.ts"
import { dispatchHandlers } from "../permissionless.ts"

function makePayload(payload: EIP1193RequestParameters) {
    return {
        key: createUUID(),
        windowId: createUUID(),
        error: null,
        payload,
    } as ProviderEventPayload<EIP1193RequestParameters>
}

vi.mock("../../utils/getDappOrigin", async () => ({
    getDappOrigin: () => "http://localhost:5173",
    getIframeOrigin: () => "http://localhost:5160",
}))

describe("#publicClient #eth_requestAccounts #cross_origin ", () => {
    describe("disconnected user", () => {
        beforeEach(() => {
            clearPermissions()
            // logout
            getDefaultStore().set(userAtom, undefined)
            getDefaultStore().set(authStateAtom, AuthState.Disconnected)
        })

        test("skips eth_requestAccounts permissions when no user", async () => {
            expect(getAllPermissions().length).toBe(0)
            const request = makePayload({ method: "eth_requestAccounts" })
            expect(dispatchHandlers(request)).rejects.toThrow(UnauthorizedProviderError)
        })
    })

    describe("connected user", () => {
        let user: HappyUser

        beforeEach(() => {
            clearPermissions()
            user = createHappyUserFromWallet("io.testing", "0x123456789")
            getDefaultStore().set(userAtom, user)
            getDefaultStore().set(authStateAtom, AuthState.Connected)
        })

        test("returns empty array nothing if not previously authorized via walletClient", async () => {
            expect(getAllPermissions().length).toBe(0)
            const request = makePayload({ method: "eth_requestAccounts" })
            const response = await dispatchHandlers(request)
            expect(response).toStrictEqual([])
            expect(getAllPermissions().length).toBe(0)
        })

        test("returns user accounts if allowed", async () => {
            grantPermissions("eth_accounts")
            expect(getAllPermissions().length).toBe(1)
            const request = makePayload({ method: "eth_requestAccounts" })
            const response = await dispatchHandlers(request)
            expect(response).toStrictEqual(user.addresses)
            expect(getAllPermissions().length).toBe(1)
        })

        test("does not add permissions", async () => {
            const user = createHappyUserFromWallet("io.testing", "0x123456789")
            getDefaultStore().set(userAtom, user)
            expect(getAllPermissions().length).toBe(0)
            const request = makePayload({ method: "eth_requestAccounts" })
            await dispatchHandlers(request)
            await dispatchHandlers(request)
            await dispatchHandlers(request)
            await dispatchHandlers(request)
            expect(getAllPermissions().length).toBe(0)
        })
    })
})
