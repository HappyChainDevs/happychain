import { keccak256 } from "viem/utils"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import { encodeHappyTx } from "./encodeHappyTx"

// with paymaster, don't include gas values in the signature!
const paymasterGasData = {
    executeGasLimit: 0n,
    gasLimit: 0n,
    maxFeePerGas: 0n,
    submitterFee: 0n,
} as const

export function computeHappyTxHash(happyTx: HappyTx): `0x${string}` {
    const isSelfPaying = happyTx.paymaster === happyTx.account

    // Don't include validator data in the signature so that pre & post signing are the same.
    // When not self-paying, don't sign over the gas fields to allow the submitter to set them.
    const hashData: HappyTx = isSelfPaying
        ? { ...happyTx, validatorData: "0x" }
        : { ...happyTx, validatorData: "0x", ...paymasterGasData }

    return keccak256(encodeHappyTx(hashData))
}
