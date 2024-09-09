import { createUUID } from "@happychain/sdk-shared"
import type {
    EIP1193RequestParameters,
    ProviderEventPayload,
} from "@happychain/sdk-shared/lib/interfaces/eip1193Provider"
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, test } from "vitest"
import { vi } from "vitest"
import { clearPermissions } from "../../services/permissions/clearPermissions"
import { getPermissions } from "../../services/permissions/getPermissions"
import { useWalletRequestPermissionsMiddleware } from "./wallet_requestPermissions"

function makePayload(payload: EIP1193RequestParameters) {
    return {
        key: createUUID(),
        windowId: createUUID(),
        error: null,
        payload,
    } as ProviderEventPayload<EIP1193RequestParameters>
}

describe("walletClient wallet_requestPermissions", () => {
    beforeEach(() => {
        clearPermissions()
    })
    test("adds eth_account permissions", async () => {
        const next = vi.fn()

        const { result } = renderHook(() => useWalletRequestPermissionsMiddleware())

        expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)

        const request = makePayload({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })

        // execute middleware
        const response = await result.current(request, next)

        expect(getPermissions({ method: "wallet_getPermissions" })).toStrictEqual(response)
        expect(response).toStrictEqual([
            {
                caveats: [],
                id: expect.any(String),
                date: expect.any(Number),
                invoker: "http://localhost:3000",
                parentCapability: "eth_accounts",
            },
        ])
    })

    test("throws error on caveat use", async () => {
        const next = vi.fn()

        const { result } = renderHook(() => useWalletRequestPermissionsMiddleware())

        expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)

        const request = makePayload({
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: { requiredMethods: ["signTypedData_v3"] } }],
        })

        // execute middleware
        expect(result.current(request, next)).rejects.toThrow("WalletPermissionCaveats Not Yet Supported")
    })

    test("only adds permissions once", async () => {
        const next = vi.fn()

        const { result } = renderHook(() => useWalletRequestPermissionsMiddleware())

        expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)

        const request = makePayload({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })

        // execute middleware
        await result.current(request, next)
        await result.current(request, next)
        await result.current(request, next)
        await result.current(request, next)

        expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(1)
    })
})
