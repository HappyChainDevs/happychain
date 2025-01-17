import type { Address } from "viem"
import { describe, expect, test } from "vitest"

import type { HappyTx } from "../../types/happyTx"
import { decode, encode } from "../../lib/happyTxLib"

// Original encode-decode test suite
describe("encode-decode", () => {
    const sampleTx: HappyTx = {
        account: "0x1234567890123456789012345678901234567890" as Address,
        gasLimit: 1000000n,
        executeGasLimit: 800000n,
        dest: "0x2345678901234567890123456789012345678901" as Address,
        paymaster: "0x3456789012345678901234567890123456789012" as Address,
        value: 1000000000000000000n, // 1 ETH
        nonce: 1n,
        maxFeePerGas: 2000000000n,
        submitterFee: 100000000n,
        callData: "0x1234",
        paymasterData: "0x5678",
        validatorData: "0x9abc",
        extraData: "0xdef0",
    }

    test("encode and decode should be reversible", () => {
        const encoded = encode(sampleTx)
        const decoded = decode(encoded)

        // Compare all fields
        expect(decoded.account).toBe(sampleTx.account)
        expect(decoded.gasLimit).toBe(sampleTx.gasLimit)
        expect(decoded.executeGasLimit).toBe(sampleTx.executeGasLimit)
        expect(decoded.dest).toBe(sampleTx.dest)
        expect(decoded.paymaster).toBe(sampleTx.paymaster)
        expect(decoded.value).toBe(sampleTx.value)
        expect(decoded.nonce).toBe(sampleTx.nonce)
        expect(decoded.maxFeePerGas).toBe(sampleTx.maxFeePerGas)
        expect(decoded.submitterFee).toBe(sampleTx.submitterFee)
        expect(decoded.callData).toBe(sampleTx.callData)
        expect(decoded.paymasterData).toBe(sampleTx.paymasterData)
        expect(decoded.validatorData).toBe(sampleTx.validatorData)
        expect(decoded.extraData).toBe(sampleTx.extraData)
    })

    test("encoding should maintain correct field sizes", () => {
        const encoded = encode(sampleTx)
        const bytes = Buffer.from(encoded.slice(2), "hex")

        // Check static field sizes
        expect(bytes.length).toBeGreaterThanOrEqual(224) // Minimum size for static fields

        // Dynamic fields should follow
        const dynamicHeader = bytes.slice(192, 224)
        const totalLen = dynamicHeader[0]
        expect(bytes.length).toBe(224 + totalLen) // Total length should match
    })
})