import type { Address } from "viem"
import { describe, expect, test } from "vitest"

import type { HappyTx } from "../../types/happyTx"
import { encode } from "../../lib/happyTxLib"

// Test cases for encoding
describe("encode", () => {
    test("should correctly encode tx with empty dynamic data", () => {
        const tx: HappyTx = {
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
            paymasterData: "0x",
            validatorData: "0x",
            extraData: "0x",
        }

        const encoded = encode(tx)
        // TODO: Replace with actual expected value
        expect(encoded).toBe("0xabcd")
    })

    test("should correctly encode tx with only extraData empty", () => {
        const tx: HappyTx = {
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

        const encoded = encode(tx)
        // TODO: Replace with actual expected value
        expect(encoded).toBe("0xabcd")
    })

    test("should correctly encode tx with all fields", () => {
        const tx: HappyTx = {
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

        const encoded = encode(tx)
        // TODO: Replace with actual expected value
        expect(encoded).toBe("0xabcd")
    })
})