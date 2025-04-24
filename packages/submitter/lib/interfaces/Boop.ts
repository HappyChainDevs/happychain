import type { Address, Bytes, Int256, UInt32, UInt256 } from "@happy.tech/common"

/**
 * Typescript version of the Boop onchain structure.
 */
export type Boop = {
    account: Address
    dest: Address
    payer: Address
    value: UInt256
    nonceTrack: UInt256
    nonceValue: UInt256
    maxFeePerGas: UInt256 //
    submitterFee: Int256 //
    gasLimit: UInt32 //
    validateGasLimit: UInt32
    executeGasLimit: UInt32
    validatePaymentGasLimit: UInt32
    callData: Bytes
    validatorData: Bytes
    extraData: Bytes
}
