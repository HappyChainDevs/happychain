import { useEffect, useMemo, useState } from "react"
import { type RpcTransactionRequest, formatEther, formatGwei } from "viem"
import { useEstimateFeesPerGas } from "wagmi"
import { queryClient } from "#src/tanstack-query/config.js"
import FieldLoader from "../loaders/FieldLoader"
import { Button } from "../primitives/button/Button"
import { BlobTxWarning } from "./BlobTxWarning"
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

function classifyTxType(tx: RpcTransactionRequest) {
    if (tx.maxFeePerGas || tx.maxPriorityFeePerGas) {
        return "EIP-1559"
    }

    if (tx.gasPrice) {
        return "EIP-1559 (converted from legacy)"
    }

    switch (tx.type) {
        case TransactionType.Legacy:
            return "Legacy"
        case TransactionType.EIP1559OptionalAccessList:
            return "EIP-1559 (optional access lists)"
        case TransactionType.EIP1559:
            return "EIP-1559"
        case TransactionType.EIP4844:
            return "EIP-4844 (unsupported)"
        case TransactionType.EIP7702:
            return "EIP-7702"
        default:
            return "Unknown"
    }
}

export const EthSendTransaction = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"eth_sendTransaction">) => {
    const [tx, setTx] = useState<RpcTransactionRequest>(params[0])

    const {
        data: { maxFeePerGas, maxPriorityFeePerGas } = {},
        isError,
        queryKey,
    } = useEstimateFeesPerGas({ type: "eip1559" })

    /**
     * if the maxFee/Gas and / or maxPriorityFee/Gas is not
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
                    <div className="flex justify-between">
                        <span className="text-sm text-neutral-content">From:</span>
                        <span className="font-mono text-sm truncate">{tx.from}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-neutral-content">To:</span>
                        <span className="font-mono text-sm truncate">{tx.to}</span>
                    </div>
                </div>

                <RequestDetails>
                    <div className="flex flex-col gap-2">
                        {/* tx type */}
                        <div className="flex justify-between">
                            <span className="text-sm text-base-content font-mono">Type</span>
                            {/* derive the type from what's sent through */}
                            <span className="font-mono text-sm">{formattedTxInfo.type}</span>
                        </div>
                        {/* Gas Details */}
                        <span className="text-sm text-content font-mono font-bold italic">Gas Details</span>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-content font-mono">MaxFeePerGas:</span>
                            {formattedTxInfo.maxFeePerGas ? (
                                <span className="font-mono text-sm uppercase truncate">{`${formattedTxInfo.maxFeePerGas} gwei`}</span>
                            ) : (
                                <FieldLoader />
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-content font-mono">PriorityFee:</span>
                            {formattedTxInfo.maxPriorityFeePerGas ? (
                                <span className="font-mono text-sm uppercase truncate">{`${formattedTxInfo.maxPriorityFeePerGas} gwei`}</span>
                            ) : (
                                <FieldLoader />
                            )}
                        </div>
                    </div>
                </RequestDetails>

                <RawRequestDetails params={params} />
            </RequestContent>

            {tx.type === TransactionType.EIP4844 ? (
                <BlobTxWarning onReject={reject} />
            ) : (
                <div className="flex w-full gap-4">
                    <Button
                        intent="primary"
                        className="grow text-neutral-content justify-center"
                        onClick={() => {
                            accept({ method, params })
                            queryClient.invalidateQueries({ queryKey })
                        }}
                    >
                        Sign
                    </Button>
                    <Button intent="outline-negative" className="text-base-content" onClick={reject}>
                        Reject
                    </Button>
                </div>
            )}
        </RequestLayout>
    )
}
