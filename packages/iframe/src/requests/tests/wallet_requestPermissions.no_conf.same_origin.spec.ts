import { type UUID, createUUID } from "@happychain/common"
import { AuthState, EIP1193UnauthorizedError } from "@happychain/sdk-shared"
import type { HappyUser } from "@happychain/sdk-shared"
import { addressFactory, makePayload } from "@happychain/testing"
import { getDefaultStore } from "jotai"
import { beforeEach, describe, expect, test } from "vitest"
import { vi } from "vitest"
import { clearPermissions, getAllPermissions } from "../../services/permissions"
import { authStateAtom } from "../../state/authState"
import { userAtom } from "../../state/user"
import { createHappyUserFromWallet } from "../../utils/createHappyUserFromWallet"
import { dispatchHandlers } from "../permissionless"

const origin = "http://localhost:4321"
vi.mock("../../utils/getDappOrigin", async () => ({
    getDappOrigin: () => origin,
    getIframeOrigin: () => origin,
}))

const parentID = createUUID()
const iframeID = createUUID()
vi.mock("../utils", (importUtils) =>
    importUtils<typeof import("../utils")>().then((utils) => ({
        ...utils,
        confirmSourceId: (sourceId: UUID) => sourceId === parentID || sourceId === iframeID,
        confirmParentId: (sourceId: UUID) => sourceId === parentID,
        confirmIframeId: (sourceId: UUID) => sourceId === iframeID,
    })),
)
describe("#publicClient #wallet_requestPermissions #same_origin", () => {
    describe("disconnected user", () => {
        beforeEach(() => {
            clearPermissions()
            // logout
            getDefaultStore().set(userAtom, undefined)
            getDefaultStore().set(authStateAtom, AuthState.Disconnected)
        })

        test("skips wallet_requestPermissions permissions when no user", async () => {
            expect(getAllPermissions({ origin }).length).toBe(0)
            const request = makePayload(iframeID, {
                method: "wallet_requestPermissions",
                params: [{ eth_accounts: {} }],
            })
            expect(dispatchHandlers(request)).rejects.toThrow(EIP1193UnauthorizedError)
        })
    })

    describe("connected user", () => {
        let user: HappyUser

        beforeEach(() => {
            clearPermissions()
            user = createHappyUserFromWallet("io.testing", addressFactory())
            getDefaultStore().set(userAtom, user)
            getDefaultStore().set(authStateAtom, AuthState.Connected)
        })

        test("does not add permissions", async () => {
            expect(getAllPermissions({ origin }).length).toBe(1)
            const request = makePayload(iframeID, {
                method: "wallet_requestPermissions",
                params: [{ eth_accounts: {} }],
            })
            await dispatchHandlers(request)
            await dispatchHandlers(request)
            await dispatchHandlers(request)
            await dispatchHandlers(request)
            expect(getAllPermissions({ origin }).length).toBe(1)
        })
    })
})
