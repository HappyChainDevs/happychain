import { createUUID } from "@happychain/common"
import { AuthState } from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, HappyUser, ProviderEventPayload } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai"
import { UnauthorizedProviderError } from "viem"
import { beforeEach, describe, expect, test } from "vitest"
import { vi } from "vitest"
import { clearPermissions, getAllPermissions } from "../../services/permissions"
import { authStateAtom } from "../../state/authState"
import { userAtom } from "../../state/user"
import { createHappyUserFromWallet } from "../../utils/createHappyUserFromWallet"
import { dispatchHandlers } from "../permissionless"

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

describe("#publicClient #wallet_requestPermissions #cross_origin", () => {
    describe("disconnected user", () => {
        beforeEach(() => {
            clearPermissions()
            // logout
            getDefaultStore().set(userAtom, undefined)
            getDefaultStore().set(authStateAtom, AuthState.Disconnected)
        })

        test("skips wallet_requestPermissions permissions when no user", async () => {
            expect(getAllPermissions().length).toBe(0)
            const request = makePayload({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })
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

        test("does not add permissions", async () => {
            expect(getAllPermissions().length).toBe(0)
            const request = makePayload({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })
            await dispatchHandlers(request)
            await dispatchHandlers(request)
            await dispatchHandlers(request)
            await dispatchHandlers(request)
            expect(getAllPermissions().length).toBe(0)
        })
    })
})
