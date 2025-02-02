import { describe, test } from "vitest"

import { decode, encode } from "../happyTxLib"
import type { HappyTx } from "../../types/happyTx"
import { assertHappyTxEqual } from "./utils"

// Original encode-decode test suite
describe("encode-decode", () => {
    const sampleTx: HappyTx = {
        account: "0x1234567890123456789012345678901234567890",
        gasLimit: 1000000n,
        executeGasLimit: 800000n,
        dest: "0x2345678901234567890123456789012345678901",
        paymaster: "0x3456789012345678901234567890123456789012",
        value: 1000000000000000000n,
        nonce: 1n,
        maxFeePerGas: 2000000000n,
        submitterFee: 100000000n,
        callData: "0x1234",
        paymasterData: "0x5678",
        validatorData: "0x9abc",
        extraData: "0xdef0"
    }

    test("encode and decode should be reversible", () => {
        const encoded = encode(sampleTx)
        const decoded = decode(encoded)

        
        assertHappyTxEqual(sampleTx, decoded)
    })
})