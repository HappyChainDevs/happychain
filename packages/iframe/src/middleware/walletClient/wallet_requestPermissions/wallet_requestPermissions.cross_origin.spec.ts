import { AuthState, createUUID } from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, HappyUser, ProviderEventPayload } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai"
import { beforeEach, describe, expect, test } from "vitest"
import { vi } from "vitest"
import { clearPermissions, getPermissions } from "../../../services/permissions"
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

describe("#walletClient #wallet_requestPermissions #cross_origin", () => {
    let user: HappyUser
    let next: () => Promise<void>

    beforeEach(() => {
        clearPermissions()

        user = createHappyUserFromWallet("io.testing", "0x123456789")
        getDefaultStore().set(userAtom, user)
        getDefaultStore().set(authStateAtom, AuthState.Connected)

        next = vi.fn()
    })

    test("adds eth_account permissions", async () => {
        expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)

        const request = makePayload({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })

        // execute middleware
        const response = await walletRequestPermissionsMiddleware(request, next)

        expect(getPermissions({ method: "wallet_getPermissions" })).toStrictEqual(response)
        expect(response).toStrictEqual([
            {
                caveats: [],
                id: expect.any(String),
                date: expect.any(Number),
                invoker: "http://localhost:5173",
                parentCapability: "eth_accounts",
            },
        ])
    })

    test("throws error on caveat use", async () => {
        expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)

        const request = makePayload({
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: { requiredMethods: ["signTypedData_v3"] } }],
        })

        // execute middleware
        expect(walletRequestPermissionsMiddleware(request, next)).rejects.toThrow(
            "WalletPermissionCaveats Not Yet Supported",
        )
    })

    test("only adds permissions once", async () => {
        expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(0)

        const request = makePayload({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })

        // execute middleware
        await walletRequestPermissionsMiddleware(request, next)
        await walletRequestPermissionsMiddleware(request, next)
        await walletRequestPermissionsMiddleware(request, next)
        await walletRequestPermissionsMiddleware(request, next)

        expect(getPermissions({ method: "wallet_getPermissions" }).length).toBe(1)
    })
})