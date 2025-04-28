import { describe, expect, it } from "bun:test"
import { serializeBigInt } from "./bigint"

describe("bigint.lossy", () => {
    it("serializes bigint values to strings recursively in nested objects", () => {
        const before = { num: 1n, nested: { deeper: 2n } }
        const after = { num: "1", nested: { deeper: "2" } }
        expect(serializeBigInt(before)).toStrictEqual(after)
    })
})
