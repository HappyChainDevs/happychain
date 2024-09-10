import { createUUID } from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, ProviderEventPayload } from "@happychain/sdk-shared"
import { renderHook } from "@testing-library/react"
import { getDefaultStore } from "jotai"
import { beforeEach, describe, expect, test } from "vitest"
import { vi } from "vitest"
import { clearPermissions } from "../../services/permissions/clearPermissions"
import { getPermissions } from "../../services/permissions/getPermissions"
import { userAtom } from "../../state/user"
import { createHappyUserFromWallet } from "../../utils/createHappyUserFromWallet"
import { useEthRequestAccountsMiddleware } from "./eth_requestAccounts"

function makePayload(payload: EIP1193RequestParameters) {
    return {
        key: createUUID(),
        windowId: createUUID(),
        error: null,
        payload,
    } as ProviderEventPayload<EIP1193RequestParameters>
}

describe("walletClient eth_requestAccounts", () => {
    beforeEach(() => {
        clearPermissions()
    })
    test("skips eth_requestAccounts permissions when no user", async () => {
        const next = vi.fn()

        const { result } = renderHook(() => useEthRequestAccountsMiddleware())

        expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)

        const request = makePayload({ method: "eth_requestAccounts" })

        // execute middleware
        const response = await result.current(request, next)
        expect(response).toStrictEqual([])
        expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)
    })

    test("adds eth_requestAccounts permissions when user", async () => {
        const next = vi.fn()

        const user = createHappyUserFromWallet("io.testing", "0x123456789")
        getDefaultStore().set(userAtom, user)

        const { result } = renderHook(() => useEthRequestAccountsMiddleware())

        expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)

        const request = makePayload({ method: "eth_requestAccounts" })

        // execute middleware
        const response = await result.current(request, next)
        expect(response).toStrictEqual(user.addresses)
        expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(1)
    })

    test("only adds permissions once", async () => {
        const next = vi.fn()

        const { result } = renderHook(() => useEthRequestAccountsMiddleware())

        expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)

        const request = makePayload({ method: "eth_requestAccounts" })

        // execute middleware
        await result.current(request, next)
        await result.current(request, next)
        await result.current(request, next)
        await result.current(request, next)

        expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(1)
    })
})
