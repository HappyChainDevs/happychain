import { type Hash, getProp } from "@happy.tech/common"
import { encodePacked, keccak256 } from "viem/utils"
import type { Boop, BoopGasInfo, BoopWithOptionalFields } from "#lib/types"
import { encodeBoop_noTrace } from "#lib/utils/boop/encodeBoop"

export const zeroGasData = {
    maxFeePerGas: 0n,
    submitterFee: 0n,
    gasLimit: 0,
    executeGasLimit: 0,
    validateGasLimit: 0,
    validatePaymentGasLimit: 0,
} as const satisfies BoopGasInfo

/**
 * Computes a boop hash, which is compute over a Boop and the chain ID.
 */
export function computeBoopHash_noTrace(chainId: bigint | number, boop: BoopWithOptionalFields): Hash {
    // Don't include validator data in the signature so that pre & post signing are the same.
    const boopToHash = { ...boop, validatorData: "0x" }

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

    return keccak256(encodePacked(["bytes", "uint"], [encodeBoop_noTrace(boopToHash as Boop), BigInt(chainId)]))
}
