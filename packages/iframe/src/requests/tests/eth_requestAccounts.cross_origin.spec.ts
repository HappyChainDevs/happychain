import { type HTTPString, type UUID, createUUID } from "@happychain/common"
import { AuthState, EIP1193UnauthorizedError } from "@happychain/sdk-shared"
import type { HappyUser } from "@happychain/sdk-shared"
import { addressFactory, makePayload } from "@happychain/testing"
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
        originForSourceID(sourceId: UUID): HTTPString | undefined {
            if (sourceId === parentID) return originDapp
            if (sourceId === iframeID) return originIframe
            return undefined
        },
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
            expect(getAllPermissions().length).toBe(0)
            const request = makePayload(parentID, { method: "eth_requestAccounts" })
            expect(dispatchHandlers(request)).rejects.toThrow(EIP1193UnauthorizedError)
        })
    })

    describe("connected user", () => {
        let user: HappyUser

        beforeEach(() => {
            clearPermissions()
            user = createHappyUserFromWallet("io.testing", addressFactory())
            setUser(user)
            setAuthState(AuthState.Connected)
        })

        // TODO TEMP HACK re-enable after fixing permissions
        // test("throws exception if not previously authorized via popup", async () => {
        //     expect(getAllPermissions().length).toBe(0)
        //     const request = makePayload(parentID, { method: "eth_requestAccounts" })
        //     const response = dispatchHandlers(request)
        //     expect(response).rejects.toThrow(EIP1193UserRejectedRequestError)
        //     expect(getAllPermissions().length).toBe(0)
        // })

        test("returns user accounts if allowed", async () => {
            grantPermissions("eth_accounts")
            expect(getAllPermissions().length).toBe(1)
            const request = makePayload(parentID, { method: "eth_requestAccounts" })
            const response = await dispatchHandlers(request)
            expect(response).toStrictEqual(user.addresses)
            expect(getAllPermissions().length).toBe(1)
        })

        // TODO TEMP HACK re-enable after fixing permissions
        // test("does not add permissions", async () => {
        //     const user = createHappyUserFromWallet("io.testing", addressFactory())
        //     getDefaultStore().set(userAtom, user)
        //     expect(getAllPermissions().length).toBe(0)
        //     const request = makePayload(parentID, { method: "eth_requestAccounts" })
        //     await expect(dispatchHandlers(request)).rejects.toThrow(EIP1193UserRejectedRequestError)
        //     await expect(dispatchHandlers(request)).rejects.toThrow(EIP1193UserRejectedRequestError)
        //     expect(getAllPermissions().length).toBe(0)
        // })
    })
})
