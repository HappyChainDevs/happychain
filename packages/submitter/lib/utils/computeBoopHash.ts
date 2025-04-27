import { encodePacked, keccak256 } from "viem/utils"
import type { Boop, BoopOptionalFields, PartialBoop } from "../interfaces/Boop"
import { encodeBoop } from "./encodeBoop"

const zeroGasData = {
    maxFeePerGas: 0n,
    submitterFee: 0n,
    gasLimit: 0,
    executeGasLimit: 0,
    validateGasLimit: 0,
    validatePaymentGasLimit: 0,
} as const satisfies Partial<Boop> & Record<BoopOptionalFields, unknown>

/**
 * Computes a boop hash, which is compute over a Boop and the chain ID.
 */
export function computeBoopHash(chainId: bigint, boop: PartialBoop): `0x${string}` {
    // Don't include validator data in the signature so that pre & post signing are the same.
    const boopToHash: PartialBoop = { ...boop, validatorData: "0x" }

    if (boop.payer === boop.account) {
        // For self-paying boops, all fields have to be specified!
        for (const key in zeroGasData) {
            // @ts-ignore
            if (boopToHash[key] === undefined)
                throw new Error(`Can't compute Boop hash: Field ${key} is undefined for a self-paying Boop.`)
        }
    } else {
        // If not self-paying, zero all the gas related values.
        Object.assign(boopToHash, zeroGasData)
    }

    return keccak256(encodePacked(["bytes", "uint"], [encodeBoop(boopToHash), chainId]))
}
