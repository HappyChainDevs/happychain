import type { Address, Bytes, Int256, UInt32, UInt256 } from "@happy.tech/common"

/**
 * Typescript version of the HappyTx onchain structure.
 */
export type HappyTx = {
    account: Address
    gasLimit: UInt32
    executeGasLimit: UInt32
    dest: Address
    value: UInt256
    callData: Bytes
    nonce: UInt256
    maxFeePerGas: UInt256
    submitterFee: Int256
    paymaster: Address
    paymasterData: Bytes
    validatorData: Bytes
    extraData: Bytes
}
