import { type Hash, getProp } from "@happy.tech/common"
import { encodePacked, keccak256 } from "viem/utils"
import type { Boop } from "#lib/types"
import { encodeBoop } from "#lib/utils/boop/encodeBoop"

const zeroGasData = {
    maxFeePerGas: 0n,
    submitterFee: 0n,
    gasLimit: 0,
    executeGasLimit: 0,
    validateGasLimit: 0,
    validatePaymentGasLimit: 0,
} as const satisfies Partial<Boop>

/**
 * Computes a boop hash, which is compute over a Boop and the chain ID.
 */
export function computeBoopHash(chainId: bigint | number, boop: Boop): Hash {
    // Don't include validator data in the signature so that pre & post signing are the same.
    const boopToHash: Boop = { ...boop, validatorData: "0x" }

    if (boop.payer === boop.account) {
        // For self-paying boops, all fields have to be specified!
        for (const key in zeroGasData) {
            if (getProp(boopToHash, key) === undefined)
                throw new Error(`Can't compute boop hash: Field ${key} is undefined for a self-paying Boop.`)
        }
    } else {
        // If not self-paying, zero all the gas related values.
        Object.assign(boopToHash, zeroGasData)
    }

    return keccak256(encodePacked(["bytes", "uint"], [encodeBoop(boopToHash), BigInt(chainId)]))
}
