import { describe, expect, it } from "bun:test"
import { serializeBigInt } from "./serializeBigInt"

describe("bigint.lossy", () => {
    it("converts bigints in object to strings", () => {
        const before = { num: 1n, nested: { deeper: 2n } }
        const after = { num: "1", nested: { deeper: "2" } }
        expect(serializeBigInt(before)).toStrictEqual(after)
    })
})
