import { describe, test } from "vitest"

import { decode, encode } from "../happyTxLib"
import type { HappyTx } from "../../types/happyTx"
import { assertHappyTxEqual } from "./utils"

describe("encode-decode", () => {
    const sampleTx: HappyTx = {
        account: "0x1234567890123456789012345678901234567890",
        gasLimit: 1000000n,
        executeGasLimit: 800000n,
        dest: "0x2345678901234567890123456789012345678901",
        paymaster: "0x3456789012345678901234567890123456789012",
        value: 1000000000000000000n, // 1 ETH (10^19 in wei)
        nonceTrack: 1234n,
        nonceValue: 5678n,
        maxFeePerGas: 2000000000n, // (2 * 10^9) wei
        submitterFee: 100000000n,  // (10^8) wei
        callData: "0x40c10f190000000000000000000000004bc8e81ad3be83276837f184138fc96770c1429700000000000000000000000000000000000000000000000000038d7ea4c68000",
        paymasterData: "0x789078907890789078907890789078907890789078907890789078907890789078907890789078907890789078907890",
        validatorData: "0x827a29d9e7e5e37adc8ae5ead7993f7d354da82a35a05da3fef21d133e22082f376916126bfece3e226c3a9bfb55354783deb43b58989d0a29ec53b4f36560cc1b",
        extraData: "0xdef0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0",
    }

    test("encode and decode should be reversible", () => {
        const encoded = encode(sampleTx)
        const decoded = decode(encoded)
        
        assertHappyTxEqual(sampleTx, decoded)
    })
})