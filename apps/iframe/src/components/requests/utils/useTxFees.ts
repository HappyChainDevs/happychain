import { parseBigInt } from "@happy.tech/common"
import type { RpcTransactionRequest } from "viem"
import { type UseEstimateFeesPerGasReturnType, useEstimateFeesPerGas } from "wagmi"
import { TransactionType } from "./transactionTypes"

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

/**
 * Estimates gas pricing details (EIP-1559 or Legacy) for a transaction using `useEstimateFeesPerGas`,
 * unless fee values (`gasPrice` or `maxFeePerGas`) are already provided in the transaction.
 *
 * Supports both legacy and EIP-1559 transaction types.
 */
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
        txMaxFeePerGas: parsedTxMaxFeePerGas ?? fetchedMaxFeePerGas,
        txMaxPriorityFeePerGas: parsedTxMaxPriorityFeePerGas ?? fetchedMaxPriorityFeePerGas,
        txGasPrice: parsedTxGasPrice ?? fetchedGasPrice,
        areFeesPending: shouldQueryFees && isPending,
        feesQueryKey,
    }
}
