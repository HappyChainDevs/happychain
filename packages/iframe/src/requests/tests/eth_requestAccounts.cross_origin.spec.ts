import { type UUID, createUUID } from "@happychain/common"
import { AuthState, EIP1193UnauthorizedError, EIP1193UserRejectedRequestError } from "@happychain/sdk-shared"
import type { HappyUser } from "@happychain/sdk-shared"
import { addressFactory, makePayload } from "@happychain/testing"
import { beforeEach, describe, expect, test } from "vitest"
import { vi } from "vitest"
import { clearPermissions, getAllPermissions, grantPermissions } from "../../services/permissions"
import { setAuthState } from "../../state/authState"
import { setUser } from "../../state/user"
import type { AppURL } from "../../utils/appURL"
import { createHappyUserFromWallet } from "../../utils/createHappyUserFromWallet"
import { dispatchHandlers } from "../permissionless"

const appURL = "http://localhost:1234" as AppURL
const iframeURL = "http://localhost:4321" as AppURL
vi.mock("../../utils/appURL", async () => ({
    getAppURL: () => appURL,
    getIframeURL: () => iframeURL,
}))

const parentID = createUUID()
const iframeID = createUUID()
vi.mock("../utils", (importUtils) =>
    importUtils<typeof import("../utils")>().then((utils) => ({
        ...utils,
        appForSourceID(sourceId: UUID): AppURL | undefined {
            if (sourceId === parentID) return appURL
            if (sourceId === iframeID) return iframeURL
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
            expect(getAllPermissions(appURL).length).toBe(0)
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

        test("throws exception if not previously authorized via popup", async () => {
            expect(getAllPermissions(appURL).length).toBe(0)
            const request = makePayload(parentID, { method: "eth_requestAccounts" })
            const response = dispatchHandlers(request)
            expect(response).rejects.toThrow(EIP1193UserRejectedRequestError)
            expect(getAllPermissions(appURL).length).toBe(0)
        })

        test("returns user accounts if allowed", async () => {
            grantPermissions(appURL, "eth_accounts")
            expect(getAllPermissions(appURL).length).toBe(1)
            const request = makePayload(parentID, { method: "eth_requestAccounts" })
            const response = await dispatchHandlers(request)
            expect(response).toStrictEqual(user.addresses)
            expect(getAllPermissions(appURL).length).toBe(1)
        })

        test("does not add permissions", async () => {
            const user = createHappyUserFromWallet("io.testing", addressFactory())
            setUser(user)
            expect(getAllPermissions(appURL).length).toBe(0)
            const request = makePayload(parentID, { method: "eth_requestAccounts" })
            await expect(dispatchHandlers(request)).rejects.toThrow(EIP1193UserRejectedRequestError)
            await expect(dispatchHandlers(request)).rejects.toThrow(EIP1193UserRejectedRequestError)
            expect(getAllPermissions(appURL).length).toBe(0)
        })
    })
})
