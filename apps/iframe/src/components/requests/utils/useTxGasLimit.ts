import { type Address, parseBigInt } from "@happy.tech/common"
import type { RpcTransactionRequest } from "viem"
import { useEstimateGas } from "wagmi"

export type UseTxGasLimitArgs = {
    tx: RpcTransactionRequest
    txValue: bigint
    account: Address | undefined
    enabled: boolean
}

export type UseTxGasLimitReturn = {
    txGasLimit?: bigint
    isGasLimitPending: boolean
    gasLimitQueryKey: readonly unknown[]
}

export function useTxGasLimit({ tx, txValue, account, enabled }: UseTxGasLimitArgs): UseTxGasLimitReturn {
    const parsedGasLimit = parseBigInt(tx.gas)
    const shouldQueryGasLimit = !parsedGasLimit && enabled

    const {
        data: fetchedGasLimit,
        isPending,
        queryKey: gasLimitQueryKey,
    } = useEstimateGas({
        account,
        data: tx.data,
        value: txValue,
        to: tx.to,
        query: {
            enabled: shouldQueryGasLimit,
        },
    })

    return {
        txGasLimit: parsedGasLimit ?? fetchedGasLimit,
        isGasLimitPending: shouldQueryGasLimit && isPending,
        gasLimitQueryKey,
    }
}
