import { useEffect, useMemo, useState } from "react"
import { type RpcTransactionRequest, formatEther, formatGwei } from "viem"
import { useEstimateFeesPerGas } from "wagmi"
import { queryClient } from "#src/tanstack-query/config"
import { Button } from "../primitives/button/Button"
import { BlobTxWarning } from "./BlobTxWarning"
import GasFieldDisplay, { GasFieldName } from "./common/GasFieldDisplay"
import RawRequestDetails from "./common/RawRequestDetails"
import RequestContent from "./common/RequestContent"
import RequestDetails from "./common/RequestDetails"
import RequestLayout from "./common/RequestLayout"
import type { RequestConfirmationProps } from "./props"

enum TransactionType {
    Legacy = "0x0",
    EIP1559OptionalAccessList = "0x1",
    EIP1559 = "0x2",
    EIP4844 = "0x3",
    EIP7702 = "0x4",
}

/**
 * This is used since specifying a type in a `useSendTransaction` call
 * doesn't propagate to the `request` function of the EIP1193Provider -
 * hence, we determine the type from the gas fields present in the tx object.
 */
function classifyTxType(tx: RpcTransactionRequest) {
    switch (tx.type) {
        case TransactionType.Legacy:
            return "EIP-1559 (converted from legacy)"
        case TransactionType.EIP1559OptionalAccessList:
            return "EIP-1559 (optional access lists)"
        case TransactionType.EIP1559:
            return "EIP-1559"
        case TransactionType.EIP4844:
            return "EIP-4844 (unsupported)"
        case TransactionType.EIP7702:
            return "EIP-7702 (unsupported)"
        default:
            // these fields will be set by the wagmi hook if not
            // already present in the tx object
            if (tx.maxFeePerGas || tx.maxPriorityFeePerGas) {
                return "EIP-1559"
            }

            if (tx.gasPrice) {
                return "EIP-1559 (converted from legacy)"
            }
    }
}

export const EthSendTransaction = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"eth_sendTransaction">) => {
    // useState + useEffect paradigm works here (over useMemo) since we will have
    // user interactions for sliders / options for setting gas manually
    const [tx, setTx] = useState<RpcTransactionRequest>(params[0])

    const {
        data: { maxFeePerGas, maxPriorityFeePerGas } = {},
        isError,
        queryKey,
    } = useEstimateFeesPerGas({ type: "eip1559" })

    /**
     * If the maxFee/Gas and / or maxPriorityFee/Gas is not
     * defined in the wagmi hook / call, we get the estimates from the namesake
     * wagmi hook and roll them into the tx object.
     *
     * cf: https://viem.sh/docs/actions/public/estimateFeesPerGas
     */
    useEffect(() => {
        setTx((prevTx) => {
            // Handle partial errors by falling back to existing values or defaults
            const safeMaxFeePerGas = isError ? (prevTx.maxFeePerGas ?? "0") : maxFeePerGas
            const safeMaxPriorityFeePerGas = isError ? (prevTx.maxPriorityFeePerGas ?? "0") : maxPriorityFeePerGas

            // If gasPrice is defined (~ legacy tx),
            // set it as maxFeePerGas and reset gasLimit to null
            const updatedMaxFeePerGas = prevTx.gasPrice ? prevTx.gasPrice : safeMaxFeePerGas
            const updatedGasLimit = prevTx.gasPrice ? null : prevTx.gasPrice

            return {
                ...prevTx,
                maxFeePerGas: updatedMaxFeePerGas,
                maxPriorityFeePerGas: safeMaxPriorityFeePerGas,
                gasPrice: updatedGasLimit,
            } as RpcTransactionRequest
        })
    }, [maxFeePerGas, maxPriorityFeePerGas, isError])

    // memo-ed values formatted for display
    const formattedTxInfo = useMemo(() => {
        return {
            value: formatEther(BigInt(tx.value ?? "0")),
            maxFeePerGas: formatGwei(BigInt(tx.maxFeePerGas ?? "0")),
            maxPriorityFeePerGas: formatGwei(BigInt(tx.maxPriorityFeePerGas ?? "0")),
            type: classifyTxType(tx),
        }
    }, [tx])

    return (
        <RequestLayout method={method}>
            <RequestContent>
                <div className="flex flex-col items-center gap-2">
                    <span className="text-sm text-neutral-content uppercase">sending</span>
                    <span className="text-2xl font-bold uppercase">{formattedTxInfo.value} HAPPY</span>
                </div>

                <div className="flex flex-col gap-4 rounded-lg bg-base-100 p-4">
                    <div className="flex justify-between items-baseline gap-[1ex]">
                        <span className="text-sm text-neutral-content">From</span>
                        <span className="font-mono text-sm truncate">{tx.from}</span>
                    </div>
                    <div className="flex justify-between items-baseline gap-[1ex]">
                        <span className="text-sm text-neutral-content">To</span>
                        <span className="font-mono text-sm truncate">{tx.to}</span>
                    </div>
                </div>

                <RequestDetails>
                    <div className="flex flex-col gap-4">
                        {/* tx type */}
                        <div className="flex justify-between items-baseline gap-[1ex]">
                            <span className="text-sm font-mono">Type</span>
                            <span className="font-mono text-sm">{formattedTxInfo.type}</span>
                        </div>
                        <div className="flex flex-col justify-between">
                            <GasFieldDisplay name={GasFieldName.MaxFeePerGas} field={formattedTxInfo.maxFeePerGas} />
                            <GasFieldDisplay
                                name={GasFieldName.MaxPriorityFeePerGas}
                                field={formattedTxInfo.maxPriorityFeePerGas}
                            />
                        </div>
                    </div>
                </RequestDetails>

                <RawRequestDetails params={params} />
            </RequestContent>

            {tx.type === TransactionType.EIP4844 ? (
                <BlobTxWarning onReject={reject} />
            ) : (
                <div className="flex flex-col w-full gap-2">
                    <Button
                        intent="primary"
                        className="text-neutral-content justify-center"
                        onClick={() => {
                            accept({ method, params })
                            queryClient.invalidateQueries({ queryKey })
                        }}
                    >
                        Sign
                    </Button>
                    <Button intent="outline-negative" className="text-base-content justify-center" onClick={reject}>
                        Reject
                    </Button>
                </div>
            )}
        </RequestLayout>
    )
}
