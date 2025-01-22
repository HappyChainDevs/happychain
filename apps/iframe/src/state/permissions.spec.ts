import { generateTestUser } from "@happy.tech/testing"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
    clearPermissions,
    getAllPermissions,
    grantPermissions,
    hasPermissions,
    revokePermissions,
} from "#src/state/permissions.ts"
import { setUser } from "../state/user"

const { appURL, iframeURL, appURLMock, requestUtilsMock } = await vi //
    .hoisted(async () => await import("#src/testing/cross_origin.mocks"))

vi.mock(import("#src/utils/appURL"), appURLMock)
vi.mock(import("#src/requests/utils"), requestUtilsMock)

describe("PermissionsService", () => {
    describe("hasPermissions", () => {
        describe("same-origin", () => {
            describe("with-user", () => {
                beforeEach(() => {
                    clearPermissions()
                    setUser(generateTestUser())
                })

                it("should return true if eth_accounts permission is granted and user exists", () => {
                    grantPermissions(appURL, "eth_accounts")
                    const result = hasPermissions(appURL, "eth_accounts")
                    expect(result).toBe(true)
                })

                it("should return false if eth_accounts permission is not granted and user exists", () => {
                    const result = hasPermissions(appURL, "eth_accounts")
                    expect(result).toBe(false)
                })

                it("should return false for an invalid permission", () => {
                    const result = hasPermissions(appURL, "invalid_permission")
                    expect(result).toBe(false)
                })
            })
            describe("without-user", () => {
                beforeEach(() => {
                    clearPermissions()
                    setUser(undefined)
                })
                it("should return false if eth_accounts permission is granted", () => {
                    grantPermissions(appURL, "eth_accounts")
                    const result = hasPermissions(appURL, "eth_accounts")
                    expect(result).toBe(false)
                })

                it("should return false if eth_accounts permission is not granted", () => {
                    const result = hasPermissions(appURL, "eth_accounts")
                    expect(result).toBe(false)
                })

                it("should return false for an invalid permission", () => {
                    const result = hasPermissions(appURL, "invalid_permission")
                    expect(result).toBe(false)
                })
            })
        })
    })

    describe("grantPermissions", () => {
        describe("same-origin", () => {
            describe("with user", () => {
                beforeEach(() => {
                    clearPermissions()
                    setUser(generateTestUser())
                })
                it("should grant eth_accounts permission", () => {
                    const initialState = hasPermissions(appURL, "eth_accounts")
                    expect(initialState).toBe(false)

                    grantPermissions(appURL, "eth_accounts")

                    const finalState = hasPermissions(appURL, "eth_accounts")
                    expect(finalState).toBe(true)
                })

                it("should not change state if eth_accounts permission is already granted", () => {
                    grantPermissions(appURL, "eth_accounts")
                    const initialState = hasPermissions(appURL, "eth_accounts")
                    expect(initialState).toBe(true)

                    grantPermissions(appURL, "eth_accounts")

                    const finalState = hasPermissions(appURL, "eth_accounts")
                    expect(finalState).toBe(true)
                })
            })

            describe("without user", () => {
                beforeEach(() => {
                    clearPermissions()
                    setUser(undefined)
                })
                it("should not grant eth_accounts permission", () => {
                    const initialState = hasPermissions(appURL, "eth_accounts")
                    expect(initialState).toBe(false)

                    grantPermissions(appURL, "eth_accounts")

                    const finalState = hasPermissions(appURL, "eth_accounts")
                    expect(finalState).toBe(false)
                })
            })
        })
        describe("cross-origin", () => {
            describe("with user", () => {
                beforeEach(() => {
                    clearPermissions()
                    setUser(generateTestUser())
                })
                it("should not grant eth_accounts permission", () => {
                    const initialState = hasPermissions(appURL, "eth_accounts")
                    expect(initialState).toBe(false)

                    grantPermissions(iframeURL, "eth_accounts")

                    const finalState = hasPermissions(appURL, "eth_accounts")
                    expect(finalState).toBe(false)
                })

                it("should not change state if eth_accounts permission is already granted", () => {
                    grantPermissions(iframeURL, "eth_accounts")
                    const initialStateA = hasPermissions(appURL, "eth_accounts")
                    expect(initialStateA).toBe(false)
                    const initialStateB = hasPermissions(iframeURL, "eth_accounts")
                    expect(initialStateB).toBe(true)

                    grantPermissions(iframeURL, "eth_accounts")

                    const finalStateA = hasPermissions(appURL, "eth_accounts")
                    expect(finalStateA).toBe(false)
                    const finalStateB = hasPermissions(iframeURL, "eth_accounts")
                    expect(finalStateB).toBe(true)
                })
            })

            describe("without user", () => {
                beforeEach(() => {
                    clearPermissions()
                    setUser(undefined)
                })
                it("should not grant eth_accounts permission", () => {
                    const initialStateA = hasPermissions(appURL, "eth_accounts")
                    expect(initialStateA).toBe(false)
                    const initialStateB = hasPermissions(iframeURL, "eth_accounts")
                    expect(initialStateB).toBe(false)
                    grantPermissions(appURL, "eth_accounts")

                    const finalStateA = hasPermissions(appURL, "eth_accounts")
                    expect(finalStateA).toBe(false)
                    const finalStateB = hasPermissions(iframeURL, "eth_accounts")
                    expect(finalStateB).toBe(false)
                })
            })
        })
    })

    describe("revokePermissions", () => {
        describe("same-origin", () => {
            describe("with user", () => {
                beforeEach(() => {
                    clearPermissions()
                    setUser(generateTestUser())
                })

                it("should revoke eth_accounts permission", () => {
                    grantPermissions(appURL, "eth_accounts")
                    const initialState = hasPermissions(appURL, "eth_accounts")
                    expect(initialState).toBe(true)

                    revokePermissions(appURL, "eth_accounts")

                    const finalState = hasPermissions(appURL, "eth_accounts")
                    expect(finalState).toBe(false)
                })

                it("should not change state if eth_accounts permission is already revoked", () => {
                    const initialState = hasPermissions(appURL, "eth_accounts")
                    expect(initialState).toBe(false)

                    revokePermissions(appURL, "eth_accounts")

                    const finalState = hasPermissions(appURL, "eth_accounts")
                    expect(finalState).toBe(false)
                })
            })

            describe("without user", () => {
                beforeEach(() => {
                    clearPermissions()
                    setUser(undefined)
                })
                it("should not change state", () => {
                    const initialState = hasPermissions(appURL, "eth_accounts")
                    expect(initialState).toBe(false)

                    revokePermissions(appURL, "eth_accounts")

                    const finalState = hasPermissions(appURL, "eth_accounts")
                    expect(finalState).toBe(false)
                })
            })
        })
        describe("cross-origin", () => {
            describe("with user", () => {
                beforeEach(() => {
                    clearPermissions()
                    setUser(generateTestUser())
                })

                it("should not revoke eth_accounts permission for wrong app", () => {
                    grantPermissions(appURL, "eth_accounts")
                    const initialState = hasPermissions(appURL, "eth_accounts")
                    expect(initialState).toBe(true)

                    revokePermissions(iframeURL, "eth_accounts")

                    const finalState = hasPermissions(appURL, "eth_accounts")
                    expect(finalState).toBe(true)
                })
            })
        })
    })

    describe("getAllPermissions", () => {
        describe("same-origin", () => {
            describe("with user", () => {
                beforeEach(() => {
                    clearPermissions()
                    setUser(generateTestUser())
                })

                it("returns empty array when no permissions have been granted", () => {
                    expect(getAllPermissions(appURL).length).toBe(0)
                })

                it("returns all permissions granted to app", () => {
                    expect(getAllPermissions(appURL).length).toBe(0)

                    grantPermissions(appURL, "eth_accounts")
                    grantPermissions(appURL, "test_permission")

                    expect(getAllPermissions(appURL).length).toBe(2)
                })
            })
            describe("without user", () => {
                beforeEach(() => {
                    clearPermissions()
                    setUser(undefined)
                })

                it("returns empty array when no permissions have been granted", () => {
                    expect(getAllPermissions(appURL).length).toBe(0)
                })
            })
        })
        describe("cross-origin", () => {
            describe("with user", () => {
                beforeEach(() => {
                    clearPermissions()
                    setUser(generateTestUser())
                })

                it("returns all permissions granted to origin", () => {
                    grantPermissions(appURL, "eth_accounts")
                    grantPermissions(appURL, "test_permission_app_1")
                    grantPermissions(appURL, "test_permission_app_2")
                    grantPermissions(iframeURL, "test_permission_iframe")
                    expect(getAllPermissions(iframeURL).length).toBe(2)
                })
            })
        })
    })
    describe("clearPermissions", () => {
        describe("with user", () => {
            beforeEach(() => {
                clearPermissions()
                setUser(generateTestUser())
            })

            it("clears all permissions granted", () => {
                expect(getAllPermissions(appURL).length).toBe(0)

                grantPermissions(appURL, "eth_accounts")
                grantPermissions(appURL, "test_permission")

                expect(getAllPermissions(appURL).length).toBe(2)

                clearPermissions()

                expect(getAllPermissions(appURL).length).toBe(0)
            })
        })
        describe("without user", () => {
            beforeEach(() => {
                clearPermissions()
                setUser(undefined)
            })

            it("clears all permissions granted", () => {
                expect(getAllPermissions(appURL).length).toBe(0)

                grantPermissions(appURL, "eth_accounts")
                grantPermissions(appURL, "test_permission")

                expect(getAllPermissions(appURL).length).toBe(0)

                clearPermissions()

                expect(getAllPermissions(appURL).length).toBe(0)
            })
        })
    })
})
