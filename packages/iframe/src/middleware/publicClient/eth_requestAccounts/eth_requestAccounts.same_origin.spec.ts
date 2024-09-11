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
import { useEthRequestAccountsMiddleware } from "./eth_requestAccounts"

function makePayload(payload: EIP1193RequestParameters) {
    return {
        key: createUUID(),
        windowId: createUUID(),
        error: null,
        payload,
    } as ProviderEventPayload<EIP1193RequestParameters>
}

vi.mock("../../../utils/getDappOrigin", async () => ({
    getDappOrigin: () => "http://localhost:5160",
    getIframeOrigin: () => "http://localhost:5160",
}))

describe("#publicClient #eth_requestAccounts #same_origin", () => {
    describe("disconnected user", () => {
        let ethRequestAccountsMiddleware: ReturnType<typeof useEthRequestAccountsMiddleware>
        let next: () => Promise<void>

        beforeEach(() => {
            // clear permissions, logout
            clearPermissions()
            getDefaultStore().set(userAtom, undefined)
            getDefaultStore().set(authStateAtom, AuthState.Disconnected)

            const { result } = renderHook(() => useEthRequestAccountsMiddleware())
            ethRequestAccountsMiddleware = result.current
        })

        test("skips eth_requestAccounts permissions when no user", async () => {
            expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)

            const request = makePayload({ method: "eth_requestAccounts" })

            // execute middleware
            expect(ethRequestAccountsMiddleware(request, next)).rejects.toThrow(UnauthorizedProviderError)
        })
    })

    describe("connected user", () => {
        let user: HappyUser
        let ethRequestAccountsMiddleware: ReturnType<typeof useEthRequestAccountsMiddleware>
        let next: () => Promise<void>

        beforeEach(() => {
            clearPermissions()

            user = createHappyUserFromWallet("io.testing", "0x123456789")
            getDefaultStore().set(userAtom, user)
            getDefaultStore().set(authStateAtom, AuthState.Connected)

            const { result } = renderHook(() => useEthRequestAccountsMiddleware())
            ethRequestAccountsMiddleware = result.current

            next = vi.fn()
        })

        test("returns connected user address when requested", async () => {
            expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(1)

            const request = makePayload({ method: "eth_requestAccounts" })

            // execute middleware
            const response = await ethRequestAccountsMiddleware(request, next)
            expect(response).toStrictEqual(user.addresses)
            expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(1)
        })

        test("does not add permissions", async () => {
            expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(1)

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
