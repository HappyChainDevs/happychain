import { AuthState, createUUID } from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, HappyUser, ProviderEventPayload } from "@happychain/sdk-shared"
import { renderHook } from "@testing-library/react"
import { getDefaultStore } from "jotai"
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

describe("#walletClient #eth_requestAccounts #same_origin", () => {
    describe("disconnected user", () => {
        beforeEach(() => {
            // clear permissions, logout
            clearPermissions()
            getDefaultStore().set(userAtom, undefined)
            getDefaultStore().set(authStateAtom, AuthState.Disconnected)
        })

        test("skips eth_requestAccounts permissions when no user", async () => {
            // mock next request
            const next = vi.fn()

            const { result } = renderHook(() => useEthRequestAccountsMiddleware())

            expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)

            const request = makePayload({ method: "eth_requestAccounts" })

            // execute middleware
            const response = await result.current(request, next)
            expect(response).toStrictEqual([])
            expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)
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

        test("adds eth_requestAccounts permissions when user", async () => {
            const next = vi.fn()

            const { result } = renderHook(() => useEthRequestAccountsMiddleware())

            expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(1)

            const request = makePayload({ method: "eth_requestAccounts" })

            // execute middleware
            const response = await result.current(request, next)
            expect(response).toStrictEqual(user.addresses)
            expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(1)
        })

        test("only adds permissions once", async () => {
            const next = vi.fn()

            const { result } = renderHook(() => useEthRequestAccountsMiddleware())

            expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(1)

            const request = makePayload({ method: "eth_requestAccounts" })

            // execute middleware
            await result.current(request, next)
            await result.current(request, next)
            await result.current(request, next)
            await result.current(request, next)

            expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(1)
        })
    })
})
