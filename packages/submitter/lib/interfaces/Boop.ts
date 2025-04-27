import type { Address, Bytes, Int256, Optional, UInt32, UInt256 } from "@happy.tech/common"

/**
 * Typescript version of the Boop onchain structure.
 */
export type Boop = {
    gasLimit: UInt32
    account: Address
    dest: Address
    payer: Address
    value: UInt256
    nonceTrack: UInt256
    nonceValue: UInt256
    maxFeePerGas: UInt256
    submitterFee: Int256
    validateGasLimit: UInt32
    executeGasLimit: UInt32
    validatePaymentGasLimit: UInt32
    callData: Bytes
    validatorData: Bytes
    extraData: Bytes
}

/** Fields of {@link Boop} that can be ommitted from an API call. */
export type BoopOptionalFields =
    | "gasLimit"
    | "executeGasLimit"
    | "validateGasLimit"
    | "validatePaymentGasLimit"
    | "maxFeePerGas"
    | "submitterFee"

/** A Boop with the fields that can be ommitted from an API call made optional. */
export type PartialBoop = Optional<Boop, BoopOptionalFields>
