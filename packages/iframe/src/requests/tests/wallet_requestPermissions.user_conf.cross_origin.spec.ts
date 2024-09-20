import { AuthState, createUUID } from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, HappyUser, ProviderEventPayload } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai"
import { beforeEach, describe, expect, test } from "vitest"
import { vi } from "vitest"
import { clearPermissions, getAllPermissions } from "../../services/permissions.ts"
import { authStateAtom } from "../../state/authState.ts"
import { userAtom } from "../../state/user.ts"
import { createHappyUserFromWallet } from "../../utils/createHappyUserFromWallet.ts"
import { dispatchHandlers } from "../approved.ts"

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

describe("#walletClient #wallet_requestPermissions #cross_origin", () => {
    let user: HappyUser

    beforeEach(() => {
        clearPermissions()
        user = createHappyUserFromWallet("io.testing", "0x123456789")
        getDefaultStore().set(userAtom, user)
        getDefaultStore().set(authStateAtom, AuthState.Connected)
    })

    test("adds eth_account permissions", async () => {
        expect(getAllPermissions().length).toBe(0)
        const request = makePayload({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })
        const response = await dispatchHandlers(request)
        expect(getAllPermissions()).toStrictEqual(response)
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
        expect(getAllPermissions().length).toBe(0)
        const request = makePayload({
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: { requiredMethods: ["signTypedData_v3"] } }],
        })
        expect(dispatchHandlers(request)).rejects.toThrow("WalletPermissionCaveats Not Yet Supported")
    })

    test("only adds permissions once", async () => {
        expect(getAllPermissions().length).toBe(0)
        const request = makePayload({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })
        await dispatchHandlers(request)
        await dispatchHandlers(request)
        await dispatchHandlers(request)
        await dispatchHandlers(request)
        expect(getAllPermissions().length).toBe(1)
    })
})
