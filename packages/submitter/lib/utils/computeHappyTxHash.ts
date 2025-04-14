import { encodePacked, keccak256 } from "viem/utils"
import { chain } from "../clients"
import type { HappyTx } from "../tmp/interface/HappyTx"
import { encodeHappyTx } from "./encodeHappyTx"

// with paymaster, don't include gas values in the signature!
const paymasterGasData = {
    executeGasLimit: 0n,
    gasLimit: 0n,
    maxFeePerGas: 0n,
    submitterFee: 0n,
    validateGasLimit: 0n,
    validatePaymentGasLimit: 0n,
} as const

export function computeHappyTxHash(happyTx: HappyTx): `0x${string}` {
    // Don't include validator data in the signature so that pre & post signing are the same
    const isSelfPaying = happyTx.paymaster === happyTx.account

    const hashData: HappyTx = isSelfPaying
        ? { ...happyTx, validatorData: "0x" }
        : { ...happyTx, validatorData: "0x", ...paymasterGasData }

    return keccak256(encodePacked(["bytes", "uint"], [encodeHappyTx(hashData), BigInt(chain.id)]))
}
