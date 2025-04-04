import { describe, expect, it } from "bun:test"
import { getErrorNameFromSelector, getSelectorFromErrorName } from "#lib/errors/parsedCodes"
describe("error-codes", () => {
    it("should encode error selectors predictably", () => {
        expect(getSelectorFromErrorName("InvalidSignature")).toBe("0x8baa579f")
        expect(getSelectorFromErrorName("UnknownDuringSimulation")).toBe("0x2c5ca398")
    })

    it("should decode error selectors predictably", () => {
        expect(getErrorNameFromSelector("0x8baa579f")).toBe("InvalidSignature")
        expect(getErrorNameFromSelector("0x2c5ca398")).toBe("UnknownDuringSimulation")
    })

    it("should not decode unknown errors", () => {
        expect(getErrorNameFromSelector("0x12345")).toBeUndefined()
    })

    it("should not encode unknown errors", () => {
        expect(getSelectorFromErrorName("NotUsedErrorName")).toBeUndefined()
    })
})
