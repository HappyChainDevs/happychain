import { createRequest } from "node-mocks-http"
import type { Address, Hex } from "viem"
import { describe, expect, it, vi } from "vitest"
import app from "../index"

describe("Submitter API", () => {
    describe("Unit Tests", () => {
        describe("POST /deployAccount", () => {
            it("should validate and accept valid deploy account request", async () => {
                const validRequest = {
                    factoryAddress: "0x1234567890123456789012345678901234567890" as Address,
                    salt: "0x1234" as Hex,
                }

                const res = await app.request("/deployAccount", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(validRequest),
                })

                expect(res.status).toBe(200)
                const data = await res.json()
                expect(data.success).toBe(true)
                expect(data.message).toContain(validRequest.factoryAddress)
                expect(data.message).toContain(validRequest.salt)
            })

            it("should reject invalid factory address", async () => {
                const invalidRequest = {
                    factoryAddress: "0xinvalid",
                    salt: "0x1234",
                }

                const res = await app.request("/deployAccount", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(invalidRequest),
                })

                expect(res.status).toBe(400)
            })
        })

        describe("POST /submitHappyTx", () => {
            it("should validate and accept valid transaction submission", async () => {
                const validRequest = {
                    encodedTx: "0x1234567890" as Hex,
                }

                const res = await app.request("/submitHappyTx", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(validRequest),
                })

                expect(res.status).toBe(200)
                const data = await res.json()
                expect(data.success).toBe(true)
                expect(data.txHash).toBeDefined()
                expect(typeof data.txHash).toBe("string")
                expect(data.txHash).toMatch(/^0x[0-9a-fA-F]+$/)
            })

            it("should reject invalid encoded transaction", async () => {
                const invalidRequest = {
                    encodedTx: "invalid-tx",
                }

                const res = await app.request("/submitHappyTx", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(invalidRequest),
                })

                expect(res.status).toBe(400)
            })
        })
    })
})
