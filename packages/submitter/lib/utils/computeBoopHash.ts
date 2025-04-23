import { encodePacked, keccak256 } from "viem/utils"
import type { Boop } from "../interfaces/Boop"
import { encodeBoop } from "./encodeBoop"

// with paymaster, don't include gas values in the signature!
const paymasterGasData = {
    maxFeePerGas: 0n,
    submitterFee: 0n,
    gasLimit: 0n,
    executeGasLimit: 0n,
    validateGasLimit: 0n,
    validatePaymentGasLimit: 0n,
} as const

export function computeBoopHash(chainId: bigint, boop: Boop): `0x${string}` {
    // Don't include validator data in the signature so that pre & post signing are the same
    const isSelfPaying = boop.payer === boop.account

    const hashData: Boop = isSelfPaying
        ? { ...boop, validatorData: "0x" }
        : { ...boop, validatorData: "0x", ...paymasterGasData }

    return keccak256(encodePacked(["bytes", "uint"], [encodeBoop(hashData), chainId]))
}
