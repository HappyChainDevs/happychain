import { describe, expect, test } from "bun:test"
import type { Hex } from "viem"
import type { Boop } from "#lib/types"
import { decodeBoop } from "./decodeBoop"
import { encodeBoop } from "./encodeBoop"

describe("encode", () => {
    test("should correctly encode tx with empty dynamic data", () => {
        const tx: Boop = {
            account: "0x1234567890123456789012345678901234567890",
            dest: "0x2345678901234567890123456789012345678901",
            payer: "0x3456789012345678901234567890123456789012",
            value: 1000000000000000000n, // 1 ETH (10^19 in wei)
            nonceTrack: 1234n,
            nonceValue: 5678n,
            maxFeePerGas: 2000000000n, // (2 * 10^9) wei
            submitterFee: 100000000n, // (10^8) wei
            gasLimit: 1000000,
            validateGasLimit: 800000,
            validatePaymentGasLimit: 800001,
            executeGasLimit: 800002,
            callData: "0x",
            validatorData: "0x",
            extraData: "0x",
        }

        const expected: Hex =
            "0x1234567890123456789012345678901234567890234567890123456789012345678901234567890134567890123456789012345678901234567890120000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000004d2000000000000162e00000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e100000f4240000c3500000c3501000c3502000000000000000000000000"

        const encoded = encodeBoop(tx)
        expect(encoded).toBe(expected)
        expect(decodeBoop(encoded)).toEqual(tx)
    })

    test("should correctly encode tx with all fields", () => {
        const tx: Boop = {
            account: "0x1234567890123456789012345678901234567890",
            dest: "0x2345678901234567890123456789012345678901",
            payer: "0x3456789012345678901234567890123456789012",
            value: 1000000000000000000n, // 1 ETH (10^19 in wei)
            nonceTrack: 1234n,
            nonceValue: 5678n,
            maxFeePerGas: 2000000000n, // (2 * 10^9) wei
            submitterFee: 100000000n, // (10^8) wei
            gasLimit: 1000000,
            validateGasLimit: 800000,
            validatePaymentGasLimit: 800001,
            executeGasLimit: 800002,
            callData: "0x0123456789",
            validatorData: "0x09abcd",
            extraData: "0xdef0",
        }

        const expected: Hex =
            "0x1234567890123456789012345678901234567890234567890123456789012345678901234567890134567890123456789012345678901234567890120000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000004d2000000000000162e00000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e100000f4240000c3500000c3501000c35020000000501234567890000000309abcd00000002def0"
        const encoded = encodeBoop(tx)
        expect(encoded).toBe(expected)
        expect(decodeBoop(encoded)).toEqual(tx)
    })

    test("should correctly encode tx with big dynamic fields", () => {
        const tx: Boop = {
            account: "0x1234567890123456789012345678901234567890",
            dest: "0x2345678901234567890123456789012345678901",
            payer: "0x3456789012345678901234567890123456789012",
            value: 1000000000000000000n, // 1 ETH (10^19 in wei)
            nonceTrack: 1234n,
            nonceValue: 5678n,
            maxFeePerGas: 2000000000n, // (2 * 10^9) wei
            submitterFee: 100000000n, // (10^8) wei
            gasLimit: 1000000,
            validateGasLimit: 800000,
            validatePaymentGasLimit: 800001,
            executeGasLimit: 800002,
            callData:
                "0x40c10f190000000000000000000000004bc8e81ad3be83276837f184138fc96770c1429700000000000000000000000000000000000000000000000000038d7ea4c68000",
            validatorData:
                "0x827a29d9e7e5e37adc8ae5ead7993f7d354da82a35a05da3fef21d133e22082f376916126bfece3e226c3a9bfb55354783deb43b58989d0a29ec53b4f36560cc1b",
            extraData: "0xdef0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0",
        }

        const expected: Hex =
            "0x1234567890123456789012345678901234567890234567890123456789012345678901234567890134567890123456789012345678901234567890120000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000004d2000000000000162e00000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e100000f4240000c3500000c3501000c35020000004440c10f190000000000000000000000004bc8e81ad3be83276837f184138fc96770c1429700000000000000000000000000000000000000000000000000038d7ea4c6800000000041827a29d9e7e5e37adc8ae5ead7993f7d354da82a35a05da3fef21d133e22082f376916126bfece3e226c3a9bfb55354783deb43b58989d0a29ec53b4f36560cc1b00000022def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0"
        const encoded = encodeBoop(tx)
        expect(encoded).toBe(expected)
        expect(decodeBoop(encoded)).toEqual(tx)
    })

    test("should correctly encode tx with only minimal fields", () => {
        const tx: Boop = {
            account: "0x0000000000000000000000000000000000000000",
            dest: "0x0000000000000000000000000000000000000000",
            payer: "0x0000000000000000000000000000000000000000",
            value: 0n,
            nonceTrack: 0n,
            nonceValue: 0n,
            maxFeePerGas: 0n,
            submitterFee: 0n,
            gasLimit: 0,
            validateGasLimit: 0,
            validatePaymentGasLimit: 0,
            executeGasLimit: 0,
            callData: "0x",
            validatorData: "0x",
            extraData: "0x",
        }

        const expected = "0x".padEnd(434, "0") as Hex
        const encoded = encodeBoop(tx)
        expect(encoded).toBe(expected)
        expect(decodeBoop(encoded)).toEqual(tx)
    })
})
