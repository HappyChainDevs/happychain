import { serve } from "@hono/node-server"
import type { Address, Hex } from "viem"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import app from "../index"

describe("Submitter API E2E Tests", () => {
    const PORT = 3333
    const BASE_URL = `http://localhost:${PORT}`
    let server: ReturnType<typeof serve>

    beforeAll(() => {
        server = serve({
            fetch: app.fetch,
            port: PORT,
        })
    })

    afterAll(() => {
        server.close()
    })

    describe("End-to-End Tests", () => {
        it("should handle complete deploy account flow", async () => {
            const deployRequest = {
                factoryAddress: "0x1234567890123456789012345678901234567890" as Address,
                salt: "0x1234" as Hex,
            }

            const deployResponse = await fetch(`${BASE_URL}/deployAccount`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(deployRequest),
            })

            expect(deployResponse.status).toBe(200)
            const deployData = await deployResponse.json()
            expect(deployData.success).toBe(true)
        })

        it("should handle complete transaction submission flow", async () => {
            const txRequest = {
                encodedTx: "0x1234567890abcdef" as Hex,
            }

            const txResponse = await fetch(`${BASE_URL}/submitHappyTx`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(txRequest),
            })

            expect(txResponse.status).toBe(200)
            const txData = await txResponse.json()
            expect(txData.success).toBe(true)
            expect(txData.txHash).toBeDefined()
        })

        it("should handle 404 for non-existent endpoints", async () => {
            const response = await fetch(`${BASE_URL}/nonexistent`)
            expect(response.status).toBe(404)
            const data = await response.json()
            expect(data.ok).toBe(false)
            expect(data.message).toBe("Not Found")
        })

        it("should handle malformed JSON requests", async () => {
            const response = await fetch(`${BASE_URL}/deployAccount`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: "invalid json",
            })

            expect(response.status).toBe(400)
        })
    })
})
