import { TransactionType, parseBigInt } from "@happy.tech/common"
import type { RpcTransactionRequest } from "viem"
import { type UseEstimateFeesPerGasReturnType, useEstimateFeesPerGas } from "wagmi"

export type UseTxFeesArgs = {
    tx: RpcTransactionRequest
    txType: TransactionType
    enabled: boolean
}

export type UseTxFeesReturn = {
    txMaxFeePerGas?: bigint
    txMaxPriorityFeePerGas?: bigint
    txGasPrice?: bigint
    areFeesPending: boolean
    feesQueryKey: readonly unknown[]
}

export function useTxFees({ tx, txType, enabled }: UseTxFeesArgs): UseTxFeesReturn {
    const parsedTxMaxFeePerGas = parseBigInt(tx.maxFeePerGas)
    const parsedTxMaxPriorityFeePerGas = parseBigInt(tx.maxPriorityFeePerGas)
    const parsedTxGasPrice = parseBigInt(tx.gasPrice)
    const shouldQueryFees = !parsedTxMaxFeePerGas && !parsedTxGasPrice && enabled

    const {
        data: {
            maxFeePerGas: fetchedMaxFeePerGas,
            maxPriorityFeePerGas: fetchedMaxPriorityFeePerGas,
            gasPrice: fetchedGasPrice,
        } = {},
        isPending,
        queryKey: feesQueryKey,
    } = useEstimateFeesPerGas({
        type: txType === TransactionType.EIP1559 ? "eip1559" : "legacy",
        query: { enabled: shouldQueryFees },
    }) as UseEstimateFeesPerGasReturnType<"eip1559"> & {
        data: {
            maxFeePerGas?: bigint
            maxPriorityFeePerGas?: bigint
            gasPrice?: bigint
        }
    }

    return {
        txMaxFeePerGas: parsedTxMaxPriorityFeePerGas ?? fetchedMaxFeePerGas,
        txMaxPriorityFeePerGas: parsedTxMaxPriorityFeePerGas ?? fetchedMaxPriorityFeePerGas,
        txGasPrice: parsedTxGasPrice ?? fetchedGasPrice,
        areFeesPending: shouldQueryFees && isPending,
        feesQueryKey,
    }
}
