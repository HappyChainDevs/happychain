import { describe, expect, it } from "bun:test"
import { serializeBigInt } from "./bigint-lossy"

describe("bigint.lossy", () => {
    it("converts bigints in object to strings", () => {
        expect(
            serializeBigInt({
                num: 1n,
                nested: { deeper: 2n },
            }),
        ).toStrictEqual({
            num: "1",
            nested: { deeper: "2" },
        })
    })
})
