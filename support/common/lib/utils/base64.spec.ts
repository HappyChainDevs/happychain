import { describe, expect, it } from "bun:test"
import { decodeUrlSafeBase64, encodeUrlSafeBase64 } from "./base64"

describe("Base64 URL Safe Encoding", () => {
    it("should encode an object to URL safe base64", () => {
        const obj = { key: "value" }
        const encoded = encodeUrlSafeBase64(obj)
        expect(encoded).toBe("eyJrZXkiOiJ2YWx1ZSJ9")
    })
    it("should handle + characters in encoding and decoding", () => {
        const obj = { value: "+·õ ~zq\x8Bèâ" }
        const encoded = encodeUrlSafeBase64(obj)
        const decoded = decodeUrlSafeBase64(encoded)
        expect(btoa(JSON.stringify(obj))).toBe("eyJ2YWx1ZSI6Iiu39SB+enGL6OIifQ==") // raw btoa output
        expect(encoded).toBe("eyJ2YWx1ZSI6Iiu39SB-enGL6OIifQ") // url safe version, missing '+' and padding
        expect(decoded).toEqual(obj) // back to the original
    })
    it("should handle / characters in encoding and decoding", () => {
        const obj = { value: "\x82\x01 ®N/s¯\x7F\x18" }
        const encoded = encodeUrlSafeBase64(obj)
        const decoded = decodeUrlSafeBase64(encoded)
        expect(btoa(JSON.stringify(obj))).toBe("eyJ2YWx1ZSI6IoJcdTAwMDEgrk4vc69/XHUwMDE4In0=") // raw btoa output
        expect(encoded).toBe("eyJ2YWx1ZSI6IoJcdTAwMDEgrk4vc69_XHUwMDE4In0") // url safe version, missing '/' and padding
        expect(decoded).toEqual(obj) // back to the original
    })

    it("should handle arbitrary objects", () => {
        const generated = generateTestStringWithPlusOrSlash()
        const encoded = encodeUrlSafeBase64(generated.object)
        const decoded = decodeUrlSafeBase64(encoded)
        expect(decoded).toEqual(generated.object) // back to the original
    })

    it("should handle special characters in encoding", () => {
        const obj = { special: "value with spaces and !@#$%^&*()+/=" }
        const encoded = encodeUrlSafeBase64(obj)
        const decoded = decodeUrlSafeBase64(encoded)
        expect(encoded).toBe("eyJzcGVjaWFsIjoidmFsdWUgd2l0aCBzcGFjZXMgYW5kICFAIyQlXiYqKCkrLz0ifQ")
        expect(decoded).toEqual({ special: "value with spaces and !@#$%^&*()+/=" })
    })
})

/**
 * Generates a test string that includes '+' or '/' characters when encoded to base64.
 */
function generateTestStringWithPlusOrSlash() {
    // 100o is an upper limit. in practice, i always got a value returned within single digits
    for (let i = 0; i < 1000; i++) {
        const value = Array.from({ length: 10 }, () => String.fromCharCode(Math.floor(Math.random() * 256))).join("")

        const json = JSON.stringify({ value })
        const b64 = btoa(json)

        if (b64.includes("+") || b64.includes("/")) {
            return {
                object: { value },
                base64: b64,
            }
        }
    }
    throw new Error("Failed to generate a string with + or / in base64 encoding")
}
