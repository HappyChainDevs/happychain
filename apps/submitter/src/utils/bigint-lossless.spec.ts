import { describe, expect, it } from "bun:test"
import { deserializeBigInt, serializeBigInt } from "./bigint-lossless"

describe("bigint.lossless", () => {
    it("converts bigints in object to strings", () => {
        expect(
            serializeBigInt({
                num: 1n,
                str: "1234",
                nested: { deeper: 2n },
            }),
        ).toStrictEqual({
            num: "#bigint.1",
            str: "1234",
            nested: { deeper: "#bigint.2" },
        })
    })

    it("converts stringified objects to bigints", () => {
        expect(
            deserializeBigInt({
                num: "#bigint.1",
                str: "1234",
                nested: { deeper: "#bigint.2" },
            } as const),
        ).toStrictEqual({
            num: 1n,
            str: "1234",
            nested: { deeper: 2n },
        })
    })
})
