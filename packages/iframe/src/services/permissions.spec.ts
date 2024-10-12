import { beforeEach, describe, expect, it } from "vitest"
import { clearPermissions, hasPermissions, grantPermissions, revokePermissions, getAllPermissions } from "./permissions"
import { setUser } from "../state/user"
import { generateTestUser } from "@happychain/testing"

describe("PermissionsService", () => {
    const originA = "http://localhost:1234"
    const originB = "http://localhost:4321"
    describe("hasPermissions", () => {
        describe("same-origin", () => {
            describe("with-user", () => {
                beforeEach(() => {
                    clearPermissions()
                    setUser(generateTestUser())
                })
                it("should return true if eth_accounts permission is granted and user exists", () => {
                    grantPermissions("eth_accounts", { origin: originA })
                    const result = hasPermissions("eth_accounts", { origin: originA })
                    expect(result).toBe(true)
                })

                it("should return false if eth_accounts permission is not granted and user exists", () => {
                    const result = hasPermissions("eth_accounts", { origin: originA })
                    expect(result).toBe(false)
                })

                it("should return false for an invalid permission", () => {
                    const result = hasPermissions("invalid_permission", { origin: originA })
                    expect(result).toBe(false)
                })
            })
            describe("without-user", () => {
                beforeEach(() => {
                    clearPermissions()
                    setUser(undefined)
                })
                it("should return false if eth_accounts permission is granted", () => {
                    grantPermissions("eth_accounts", { origin: originA })
                    const result = hasPermissions("eth_accounts", { origin: originA })
                    expect(result).toBe(false)
                })

                it("should return false if eth_accounts permission is not granted", () => {
                    const result = hasPermissions("eth_accounts", { origin: originA })
                    expect(result).toBe(false)
                })

                it("should return false for an invalid permission", () => {
                    const result = hasPermissions("invalid_permission", { origin: originA })
                    expect(result).toBe(false)
                })
            })
        })
        describe("cross-origin", () => {
            describe("with-user", () => {
                beforeEach(() => {
                    clearPermissions()
                    setUser(generateTestUser())
                })
                it("should return false if eth_accounts permission is granted and user exists", () => {
                    grantPermissions("eth_accounts", { origin: originA })
                    const result = hasPermissions("eth_accounts", { origin: originB })
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
                    const initialState = hasPermissions("eth_accounts", { origin: originA })
                    expect(initialState).toBe(false)

                    grantPermissions("eth_accounts", { origin: originA })

                    const finalState = hasPermissions("eth_accounts", { origin: originA })
                    expect(finalState).toBe(true)
                })

                it("should not change state if eth_accounts permission is already granted", () => {
                    grantPermissions("eth_accounts", { origin: originA })
                    const initialState = hasPermissions("eth_accounts", { origin: originA })
                    expect(initialState).toBe(true)

                    grantPermissions("eth_accounts", { origin: originA })

                    const finalState = hasPermissions("eth_accounts", { origin: originA })
                    expect(finalState).toBe(true)
                })
            })

            describe("without user", () => {
                beforeEach(() => {
                    clearPermissions()
                    setUser(undefined)
                })
                it("should not grant eth_accounts permission", () => {
                    const initialState = hasPermissions("eth_accounts", { origin: originA })
                    expect(initialState).toBe(false)

                    grantPermissions("eth_accounts", { origin: originA })

                    const finalState = hasPermissions("eth_accounts", { origin: originA })
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
                    const initialState = hasPermissions("eth_accounts", { origin: originA })
                    expect(initialState).toBe(false)

                    grantPermissions("eth_accounts", { origin: originB })

                    const finalState = hasPermissions("eth_accounts", { origin: originA })
                    expect(finalState).toBe(false)
                })

                it("should not change state if eth_accounts permission is already granted", () => {
                    grantPermissions("eth_accounts", { origin: originB })
                    const initialStateA = hasPermissions("eth_accounts", { origin: originA })
                    expect(initialStateA).toBe(false)
                    const initialStateB = hasPermissions("eth_accounts", { origin: originB })
                    expect(initialStateB).toBe(true)

                    grantPermissions("eth_accounts", { origin: originB })

                    const finalStateA = hasPermissions("eth_accounts", { origin: originA })
                    expect(finalStateA).toBe(false)
                    const finalStateB = hasPermissions("eth_accounts", { origin: originB })
                    expect(finalStateB).toBe(true)
                })
            })

            describe("without user", () => {
                beforeEach(() => {
                    clearPermissions()
                    setUser(undefined)
                })
                it("should not grant eth_accounts permission", () => {
                    const initialStateA = hasPermissions("eth_accounts", { origin: originA })
                    expect(initialStateA).toBe(false)
                    const initialStateB = hasPermissions("eth_accounts", { origin: originB })
                    expect(initialStateB).toBe(false)
                    grantPermissions("eth_accounts", { origin: originA })

                    const finalStateA = hasPermissions("eth_accounts", { origin: originA })
                    expect(finalStateA).toBe(false)
                    const finalStateB = hasPermissions("eth_accounts", { origin: originB })
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
                    grantPermissions("eth_accounts", { origin: originA })
                    const initialState = hasPermissions("eth_accounts", { origin: originA })
                    expect(initialState).toBe(true)

                    revokePermissions("eth_accounts", { origin: originA })

                    const finalState = hasPermissions("eth_accounts", { origin: originA })
                    expect(finalState).toBe(false)
                })

                it("should not change state if eth_accounts permission is already revoked", () => {
                    const initialState = hasPermissions("eth_accounts", { origin: originA })
                    expect(initialState).toBe(false)

                    revokePermissions("eth_accounts", { origin: originA })

                    const finalState = hasPermissions("eth_accounts", { origin: originA })
                    expect(finalState).toBe(false)
                })
            })

            describe("without user", () => {
                beforeEach(() => {
                    clearPermissions()
                    setUser(undefined)
                })
                it("should not change state", () => {
                    const initialState = hasPermissions("eth_accounts", { origin: originA })
                    expect(initialState).toBe(false)

                    revokePermissions("eth_accounts", { origin: originA })

                    const finalState = hasPermissions("eth_accounts", { origin: originA })
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

                it("should not revoke eth_accounts permission for wrong origin", () => {
                    grantPermissions("eth_accounts", { origin: originA })
                    const initialState = hasPermissions("eth_accounts", { origin: originA })
                    expect(initialState).toBe(true)

                    revokePermissions("eth_accounts", { origin: originB })

                    const finalState = hasPermissions("eth_accounts", { origin: originA })
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
                    expect(getAllPermissions({ origin: originA }).length).toBe(0)
                })

                it("returns all permissions granted to origin", () => {
                    expect(getAllPermissions({ origin: originA }).length).toBe(0)

                    grantPermissions("eth_accounts", { origin: originA })
                    grantPermissions("test_permission", { origin: originA })

                    expect(getAllPermissions({ origin: originA }).length).toBe(2)
                })
            })
            describe("without user", () => {
                beforeEach(() => {
                    clearPermissions()
                    setUser(undefined)
                })

                it("returns empty array when no permissions have been granted", () => {
                    expect(getAllPermissions({ origin: originA }).length).toBe(0)
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
                    grantPermissions("eth_accounts", { origin: originA })
                    grantPermissions("test_permission", { origin: originA })
                    grantPermissions("correct_origin", { origin: originB })

                    expect(getAllPermissions({ origin: originB }).length).toBe(1)
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
                expect(getAllPermissions({ origin: originA }).length).toBe(0)

                grantPermissions("eth_accounts", { origin: originA })
                grantPermissions("test_permission", { origin: originA })

                expect(getAllPermissions({ origin: originA }).length).toBe(2)

                clearPermissions()

                expect(getAllPermissions({ origin: originA }).length).toBe(0)
            })
        })
        describe("without user", () => {
            beforeEach(() => {
                clearPermissions()
                setUser(undefined)
            })

            it("clears all permissions granted", () => {
                expect(getAllPermissions({ origin: originA }).length).toBe(0)

                grantPermissions("eth_accounts", { origin: originA })
                grantPermissions("test_permission", { origin: originA })

                expect(getAllPermissions({ origin: originA }).length).toBe(0)

                clearPermissions()

                expect(getAllPermissions({ origin: originA }).length).toBe(0)
            })
        })
    })
})
