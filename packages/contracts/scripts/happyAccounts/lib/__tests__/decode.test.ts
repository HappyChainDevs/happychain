import type { Address } from "viem"
import { describe, expect, test } from "vitest"

import type { HappyTx } from "../../types/happyTx"
import { decode } from "../../lib/happyTxLib"

// Test cases for decoding
describe("decode", () => {
    test("should correctly decode tx with empty dynamic data", () => {
        // TODO: Replace with actual encoded value
        const encoded = "0xabcd"
        const expected: HappyTx = {
            account: "0x1234567890123456789012345678901234567890" as Address,
            gasLimit: 1000000n,
            executeGasLimit: 800000n,
            dest: "0x2345678901234567890123456789012345678901" as Address,
            paymaster: "0x3456789012345678901234567890123456789012" as Address,
            value: 1000000000000000000n,
            nonce: 1n,
            maxFeePerGas: 2000000000n,
            submitterFee: 100000000n,
            callData: "0x1234",
            paymasterData: "0x",
            validatorData: "0x",
            extraData: "0x",
        }

        const decoded = decode(encoded)
        expect(decoded.account).toBe(expected.account)
        expect(decoded.gasLimit).toBe(expected.gasLimit)
        expect(decoded.executeGasLimit).toBe(expected.executeGasLimit)
        expect(decoded.dest).toBe(expected.dest)
        expect(decoded.paymaster).toBe(expected.paymaster)
        expect(decoded.value).toBe(expected.value)
        expect(decoded.nonce).toBe(expected.nonce)
        expect(decoded.maxFeePerGas).toBe(expected.maxFeePerGas)
        expect(decoded.submitterFee).toBe(expected.submitterFee)
        expect(decoded.callData).toBe(expected.callData)
        expect(decoded.paymasterData).toBe(expected.paymasterData)
        expect(decoded.validatorData).toBe(expected.validatorData)
        expect(decoded.extraData).toBe(expected.extraData)
    })

    test("should correctly decode tx with only extraData empty", () => {
        // TODO: Replace with actual encoded value
        const encoded = "0xabcd"
        const expected: HappyTx = {
            account: "0x1234567890123456789012345678901234567890" as Address,
            gasLimit: 1000000n,
            executeGasLimit: 800000n,
            dest: "0x2345678901234567890123456789012345678901" as Address,
            paymaster: "0x3456789012345678901234567890123456789012" as Address,
            value: 1000000000000000000n,
            nonce: 1n,
            maxFeePerGas: 2000000000n,
            submitterFee: 100000000n,
            callData: "0x1234",
            paymasterData: "0x5678",
            validatorData: "0x9abc",
            extraData: "0x",
        }

        const decoded = decode(encoded)
        expect(decoded.account).toBe(expected.account)
        expect(decoded.gasLimit).toBe(expected.gasLimit)
        expect(decoded.executeGasLimit).toBe(expected.executeGasLimit)
        expect(decoded.dest).toBe(expected.dest)
        expect(decoded.paymaster).toBe(expected.paymaster)
        expect(decoded.value).toBe(expected.value)
        expect(decoded.nonce).toBe(expected.nonce)
        expect(decoded.maxFeePerGas).toBe(expected.maxFeePerGas)
        expect(decoded.submitterFee).toBe(expected.submitterFee)
        expect(decoded.callData).toBe(expected.callData)
        expect(decoded.paymasterData).toBe(expected.paymasterData)
        expect(decoded.validatorData).toBe(expected.validatorData)
        expect(decoded.extraData).toBe(expected.extraData)
    })

    test("should correctly decode tx with all fields", () => {
        // TODO: Replace with actual encoded value
        const encoded = "0xabcd"
        const expected: HappyTx = {
            account: "0x1234567890123456789012345678901234567890" as Address,
            gasLimit: 1000000n,
            executeGasLimit: 800000n,
            dest: "0x2345678901234567890123456789012345678901" as Address,
            paymaster: "0x3456789012345678901234567890123456789012" as Address,
            value: 1000000000000000000n,
            nonce: 1n,
            maxFeePerGas: 2000000000n,
            submitterFee: 100000000n,
            callData: "0x1234",
            paymasterData: "0x5678",
            validatorData: "0x9abc",
            extraData: "0xdef0",
        }

        const decoded = decode(encoded)
        expect(decoded.account).toBe(expected.account)
        expect(decoded.gasLimit).toBe(expected.gasLimit)
        expect(decoded.executeGasLimit).toBe(expected.executeGasLimit)
        expect(decoded.dest).toBe(expected.dest)
        expect(decoded.paymaster).toBe(expected.paymaster)
        expect(decoded.value).toBe(expected.value)
        expect(decoded.nonce).toBe(expected.nonce)
        expect(decoded.maxFeePerGas).toBe(expected.maxFeePerGas)
        expect(decoded.submitterFee).toBe(expected.submitterFee)
        expect(decoded.callData).toBe(expected.callData)
        expect(decoded.paymasterData).toBe(expected.paymasterData)
        expect(decoded.validatorData).toBe(expected.validatorData)
        expect(decoded.extraData).toBe(expected.extraData)
    })
})