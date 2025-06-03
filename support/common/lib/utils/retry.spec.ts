import { describe, expect, it } from "bun:test"
import { retry } from "./retry"

describe("retry", () => {
    it("should retry the function until it succeeds", async () => {
        let attempts = 0
        const fn = async () => {
            attempts++
            if (attempts < 3) throw new Error("Failed")
            return "Success"
        }

        const result = await retry(fn, 5, 100)
        expect(result).toBe("Success")
        expect(attempts).toBe(3)
    })

    it("should throw the last error if all retries fail", async () => {
        const fn = async () => {
            throw new Error("Failed")
        }

        await expect(retry(fn, 3, 100)).rejects.toThrow("Failed")
    })

    it("should call onRetry callback on each failure", async () => {
        let attempts = 0
        const onRetry = (_attempt: number, error: unknown) => {
            attempts++
            expect(_attempt).toBe(attempts)
            expect(error).toBeInstanceOf(Error)
        }

        const fn = async () => {
            throw new Error("Failed")
        }

        await expect(retry(fn, 3, 100, onRetry)).rejects.toThrow("Failed")
        expect(attempts).toBe(3)
    })
})
