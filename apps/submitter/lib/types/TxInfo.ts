import type { Hash } from "@happy.tech/common"
import type { Boop } from "./Boop"

export type EvmTxInfo = {
    evmTxHash: Hash
    nonce: number
    maxFeePerGas: bigint
    maxPriorityFeePerGas: bigint
}

export type BoopGasInfo = {
    maxFeePerGas: bigint
    submitterFee: bigint
    gasLimit: number
    executeGasLimit: number
    validateGasLimit: number
    validatePaymentGasLimit: number
}

export function extractFeeInfo(boop: Boop): BoopGasInfo {
    const { maxFeePerGas, submitterFee, gasLimit, executeGasLimit, validateGasLimit, validatePaymentGasLimit } = boop
    return { maxFeePerGas, submitterFee, gasLimit, executeGasLimit, validateGasLimit, validatePaymentGasLimit }
}
