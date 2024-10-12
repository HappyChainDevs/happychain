import { type UUID, createUUID } from "@happychain/common"
import { AuthState, EIP1193UnauthorizedError, EIP1193UserRejectedRequestError } from "@happychain/sdk-shared"
import type { HappyUser } from "@happychain/sdk-shared"
import { addressFactory, generateTestUser, makePayload } from "@happychain/testing"
import { beforeEach, describe, expect, test } from "vitest"
import { vi } from "vitest"
import { clearPermissions, getAllPermissions, grantPermissions } from "../../services/permissions"
import { setAuthState } from "../../state/authState"
import { setUser } from "../../state/user"
import { createHappyUserFromWallet } from "../../utils/createHappyUserFromWallet"
import { dispatchHandlers } from "../permissionless"

const originDapp = "http://localhost:1234"
const originIframe = "http://localhost:4321"
vi.mock("../../utils/getDappOrigin", async () => ({
    getDappOrigin: () => originDapp,
    getIframeOrigin: () => originIframe,
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

describe("#publicClient #eth_requestAccounts #cross_origin ", () => {
    describe("disconnected user", () => {
        beforeEach(() => {
            clearPermissions()
            // logout
            setUser(undefined)
            setAuthState(AuthState.Disconnected)
        })

        test("skips eth_requestAccounts permissions when no user", async () => {
            expect(getAllPermissions({ origin: originDapp }).length).toBe(0)
            const request = makePayload(parentID, { method: "eth_requestAccounts" })
            expect(dispatchHandlers(request)).rejects.toThrow(EIP1193UnauthorizedError)
        })
    })

    describe("connected user", () => {
        let user: HappyUser

        beforeEach(() => {
            clearPermissions()
            user = generateTestUser()
            setUser(user)
            setAuthState(AuthState.Connected)
        })

        test("throws exception if not previously authorized via popup #what", async () => {
            expect(getAllPermissions({ origin: originDapp }).length).toBe(0)
            expect(getAllPermissions({ origin: originIframe }).length).toBe(1)

            const request = makePayload(parentID, { method: "eth_requestAccounts" })
            const response = dispatchHandlers(request)

            expect(response).rejects.toThrow(EIP1193UserRejectedRequestError)
            expect(getAllPermissions({ origin: originDapp }).length).toBe(0)
            expect(getAllPermissions({ origin: originIframe }).length).toBe(1)
        })

        test("returns user accounts if allowed", async () => {
            grantPermissions("eth_accounts", { origin: originDapp })
            expect(getAllPermissions({ origin: originDapp }).length).toBe(1)

            const request = makePayload(parentID, { method: "eth_requestAccounts" })
            const response = await dispatchHandlers(request)

            expect(response).toStrictEqual(user.addresses)
            expect(getAllPermissions({ origin: originDapp }).length).toBe(1)
        })

        test("does not add permissions", async () => {
            const user = createHappyUserFromWallet("io.testing", addressFactory())
            setUser(user)
            expect(getAllPermissions({ origin: originDapp }).length).toBe(0)
            const request = makePayload(parentID, { method: "eth_requestAccounts" })
            await expect(dispatchHandlers(request)).rejects.toThrow(EIP1193UserRejectedRequestError)
            await expect(dispatchHandlers(request)).rejects.toThrow(EIP1193UserRejectedRequestError)
            expect(getAllPermissions({ origin: originDapp }).length).toBe(0)
        })
    })
})
