import { AuthState, createUUID } from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, HappyUser, ProviderEventPayload } from "@happychain/sdk-shared"
import { renderHook } from "@testing-library/react"
import { getDefaultStore } from "jotai"
import { UnauthorizedProviderError } from "viem"
import { beforeEach, describe, expect, test } from "vitest"
import { vi } from "vitest"
import { clearPermissions } from "../../../services/permissions/clearPermissions"
import { getPermissions } from "../../../services/permissions/getPermissions"
import { authStateAtom } from "../../../state/authState"
import { userAtom } from "../../../state/user"
import { createHappyUserFromWallet } from "../../../utils/createHappyUserFromWallet"
import { walletRequestPermissionsMiddleware } from "./wallet_requestPermissions"

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

describe("#publicClient #wallet_requestPermissions #cross_origin", () => {
    describe("disconnected user", () => {
        let next: () => Promise<void>

        beforeEach(() => {
            // clear permissions, logout
            clearPermissions()
            getDefaultStore().set(userAtom, undefined)
            getDefaultStore().set(authStateAtom, AuthState.Disconnected)

            next = vi.fn()
        })

        test("skips wallet_requestPermissions permissions when no user", async () => {
            expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)

            const request = makePayload({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })

            // execute middleware
            expect(walletRequestPermissionsMiddleware(request, next)).rejects.toThrow(UnauthorizedProviderError)
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

        test("does not add permissions", async () => {
            expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)

            const request = makePayload({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })

            // execute middleware
            await walletRequestPermissionsMiddleware(request, next)
            await walletRequestPermissionsMiddleware(request, next)
            await walletRequestPermissionsMiddleware(request, next)
            await walletRequestPermissionsMiddleware(request, next)

            expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)
        })
    })
})
