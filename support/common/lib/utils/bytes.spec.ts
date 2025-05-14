import { describe, expect, it } from "bun:test"
import { InvalidAddressError } from "viem"
import {
    bytesToAddress,
    bytesToBigInt,
    bytesToNumber,
    getBytes,
    getDynamicLengthBytes,
    toBytes,
    toDynamicLengthBytes,
} from "./bytes"

describe("bytes", () => {
    describe("toBytes", () => {
        it("should convert a number to bytes", () => {
            expect(toBytes(255, 1)).toBe("ff")
            expect(toBytes(255, 2)).toBe("00ff")
            expect(toBytes(255, 3)).toBe("0000ff")
            expect(toBytes(255, 4)).toBe("000000ff")
        })

        it("should convert a bigint to bytes", () => {
            expect(toBytes(255n, 1)).toBe("ff")
            expect(toBytes(255n, 2)).toBe("00ff")
            expect(toBytes(255n, 3)).toBe("0000ff")
            expect(toBytes(255n, 4)).toBe("000000ff")
        })

        it("should convert undefined to bytes", () => {
            expect(toBytes(undefined, 0)).toBe("")
            expect(toBytes(undefined, 1)).toBe("00")
            expect(toBytes(undefined, 2)).toBe("0000")
            expect(toBytes(undefined, 3)).toBe("000000")
        })

        it("should pass through a bytestring", () => {
            expect(toBytes("ff", 1)).toBe("ff")
            expect(toBytes("00ff", 2)).toBe("00ff")
            expect(toBytes("0000ff", 3)).toBe("0000ff")
            expect(toBytes("000000ff", 4)).toBe("000000ff")
        })

        it("should fail when invalid bytes are supplied as string", () => {
            expect(() => toBytes("yz", 1)).toThrow("Invalid bytes: yz")
        })

        it("should pad a bytestring", () => {
            expect(toBytes("f", 1)).toBe("0f")
            expect(toBytes("ff", 2)).toBe("00ff")
            expect(toBytes("fff", 3)).toBe("000fff")
            expect(toBytes("ffff", 4)).toBe("0000ffff")
        })

        it("should strip leading '0x' from a bytestring", () => {
            expect(toBytes("0xff", 1)).toBe("ff")
            expect(toBytes("0x00ff", 2)).toBe("00ff")
            expect(toBytes("0x0000ff", 3)).toBe("0000ff")
            expect(toBytes("0x000000ff", 4)).toBe("000000ff")
        })
    })
    describe("toDynamicLengthBytes", () => {
        it("should convert a string to dynamic length bytes", () => {
            expect(toDynamicLengthBytes("ff")).toBe("00000001ff")
            expect(toDynamicLengthBytes("fff")).toBe("000000020fff")
            expect(toDynamicLengthBytes("f")).toBe("000000010f")
        })

        it("should prefix with 3 byte length", () => {
            expect(toDynamicLengthBytes("ff", 3)).toBe("000001ff")
            expect(toDynamicLengthBytes("fff", 3)).toBe("0000020fff")
            expect(toDynamicLengthBytes("f", 3)).toBe("0000010f")
        })
    })
    describe("getBytes", () => {
        it("should get bytes from a string", () => {
            expect(getBytes("00000001ff", 0, 1)).toBe("00")
            expect(getBytes("00000001ff", 0, 2)).toBe("0000")
            expect(getBytes("00000001ff", 0, 3)).toBe("000000")
            expect(getBytes("00000001ff", 0, 4)).toBe("00000001")
            expect(getBytes("00000001ff", 1, 1)).toBe("00")
            expect(getBytes("00000001ff", 1, 2)).toBe("0000")
            expect(getBytes("00000001ff", 1, 3)).toBe("000001")
        })
    })
    describe("getDynamicLengthBytes", () => {
        it("should get dynamic length bytes from a string", () => {
            expect(getDynamicLengthBytes("00000001ff", 0)).toEqual(["ff", 5])
            expect(getDynamicLengthBytes("000000020fff", 0)).toEqual(["0fff", 6])
            expect(getDynamicLengthBytes("00000001f", 0)).toEqual(["f", 5])
        })
    })
    describe("bytesToBigInt", () => {
        it("should convert bytes to bigint", () => {
            expect(bytesToBigInt("ff")).toBe(255n)
            expect(bytesToBigInt("00ff")).toBe(255n)
            expect(bytesToBigInt("0x0000ff")).toBe(255n)
            expect(bytesToBigInt("0x000000ff")).toBe(255n)
        })
    })
    describe("bytesToNumber", () => {
        it("should convert bytes to number", () => {
            expect(bytesToNumber("ff")).toBe(255)
            expect(bytesToNumber("00ff")).toBe(255)
            expect(bytesToNumber("0x0000ff")).toBe(255)
            expect(bytesToNumber("0x000000ff")).toBe(255)
        })
    })
    describe("bytesToAddress", () => {
        it("should convert bytes to address", () => {
            const target = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
            expect(bytesToAddress("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")).toBe(target) // checksummed
            expect(bytesToAddress("f39Fd6e51aad88F6F4ce6aB8827279cffFb92266")).toBe(target) // checksummed
            expect(bytesToAddress("f39fd6e51aad88f6f4ce6ab8827279cfffb92266")).toBe(target) // lowercase
            expect(bytesToAddress(1390849295786071768276380950238675083608645509734n)).toBe(target)
            expect(() => bytesToAddress("000z00ff")).toThrow(InvalidAddressError)
        })
    })
})
