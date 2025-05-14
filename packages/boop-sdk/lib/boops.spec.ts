import { describe, expect, it } from "bun:test"
import { type Hex, bytesToHex } from "@happy.tech/common"
import { ExtraDataKey, decodeExtraData, encodeExtraData } from "./boops"

const ValidatorKey = ExtraDataKey.Validator
const ExecutorKey = ExtraDataKey.Executor

const ValidatorKeyBytes = bytesToHex(ValidatorKey, 3)
const ExecutorKeyBytes = bytesToHex(ExecutorKey, 3)
describe("ExtraData", () => {
    it("should encode extra data correctly", () => {
        const encoded = encodeExtraData({ [ValidatorKeyBytes]: 1234 })
        expect(encoded).toBe("0x00000100000204d2")
    })

    it("should decode extra data correctly", () => {
        const decoded = decodeExtraData(encodeExtraData({ [ValidatorKey]: 1234 }))
        expect(decoded).toStrictEqual({ [ValidatorKeyBytes]: bytesToHex(1234) })
        expect(decoded).toEqual({ "0x000001": "0x04d2" })
    })

    it("should encode multi-key extra data correctly", () => {
        const data: Record<Hex, number | Hex> = {
            [ValidatorKey]: 1234,
            [ExecutorKey]: 5678901234,
            "0xcafe": "0xdeadbeef",
        }
        const encoded = encodeExtraData(data)
        expect(encoded).toBe("0x00000100000204d200000200000501527d27f200cafe000004deadbeef")
    })

    it("should decode multi-key extra data correctly", () => {
        const encoded = "0x00000100000204d200000200000501527d27f200cafe000004deadbeef"
        const decoded = decodeExtraData(encoded)
        expect(Number(decoded[ValidatorKeyBytes])).toBe(1234)
        expect(Number(decoded[ExecutorKeyBytes])).toBe(5678901234)
        expect(decoded[bytesToHex("0xcafe", 3)]).toBe("0xdeadbeef")
    })
})
