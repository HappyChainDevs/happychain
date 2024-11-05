import { type RpcTransactionRequest, formatEther } from "viem"
import { requestLabels } from "../../constants/requestLabels"
import { StorageKey, storage } from "../../services/storage"
import { BlobTxWarning } from "./common/BlobTxWarning"
import type { RequestConfirmationProps } from "./props"

const user = storage.get(StorageKey.HappyUser)

export function EthSendTransaction({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"eth_sendTransaction">) {
    const tx: RpcTransactionRequest = params[0]

    const shouldEstimateGas = !tx.maxFeePerGas && !tx.maxPriorityFeePerGas

    // const { data: gasEstimate } = useEstimateGas({
    //     chainId: Number(getCurrentChain().chainId),
    //     to: tx.to as `0x${string}`,
    //     value: tx.value ? BigInt(tx.value) : undefined,
    //     data: tx.data,
    //     account: user?.address,
    // })

    const classifyTxType = (tx: RpcTransactionRequest) => {
        if (tx.maxFeePerGas || tx.maxPriorityFeePerGas) {
            return "EIP-1559"
        }

        switch (tx.type) {
            case "0x0":
            case "0x1":
                return "EIP-1559 (converted from legacy)"
            case "0x2":
                return "EIP-1559"
            case "0x3":
                return "EIP-4844 (unsupported)"
            case "0x4":
                return "EIP-7702"
            default:
                return "Unknown"
        }
    }

    /**
     * Handles transaction acceptance by normalizing gas parameters:
     * - if no gas parameters are set (shouldEstimateGas is true):
     *   - if `gasPrice` exists (legacy tx), convert it to `maxFeePerGas` and remove gasPrice
     *   - otherwise, use wagmi's gas estimate for `maxFeePerGas` and set `maxPriorityFeePerGas` to 0
     * - if gas parameters are already set (maxFeePerGas or maxPriorityFeePerGas exist),
     *   use them as is without modification
     */
    const normalizeAndAcceptTransaction = (tx: RpcTransactionRequest) => {
        const updatedTx = { ...tx }
        if (shouldEstimateGas) {
            if (tx.gasPrice) {
                // recast legacy tx to eip1559 tx
                updatedTx.maxFeePerGas = tx.gasPrice as `0x${string}`
                updatedTx.gasPrice = undefined
            } else {
                updatedTx.maxFeePerGas = "0x10F1" // 4337 in hex - dummy value
                updatedTx.maxPriorityFeePerGas = "0x0"
            }
        }

        accept({ method, params: [updatedTx] })
    }

    return (
        <main className="flex h-dvh flex-col items-start justify-between gap-4 bg-base-300 p-4">
            <div className="flex w-full grow flex-col gap-4">
                <div className="w-full rounded-lg bg-base-200 p-4 font-bold">{window.location.origin}</div>
                <div className="w-full rounded-lg bg-base-200 p-4 font-bold">
                    {requestLabels[method] ?? "Unknown Signature Type"}
                </div>

                <div className="flex grow flex-col gap-4 overflow-y-auto rounded-lg bg-base-200 p-4">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-sm text-gray-600">SENDING</span>
                            <span className="text-3xl font-bold">{formatEther(BigInt(tx.value ?? "0"))} HAPPY</span>
                        </div>

                        <div className="flex flex-col gap-4 rounded-lg bg-base-100 p-4">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">From</span>
                                <span className="font-mono text-sm">{tx.from}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">To</span>
                                <span className="font-mono text-sm">{tx.to}</span>
                            </div>
                        </div>

                        <details className="collapse collapse-arrow bg-base-100">
                            <summary className="collapse-title text-sm font-medium">View Transaction Details</summary>
                            <div className="collapse-content flex flex-col gap-3">
                                <div className="flex flex-col gap-2">
                                    {/* tx type */}
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 font-mono">Type</span>
                                        <span className="font-mono text-sm">{classifyTxType(tx)}</span>
                                    </div>
                                    {/* Gas Details */}
                                    <span className="text-sm text-gray-600 font-mono font-bold">Gas Details</span>
                                    {tx.maxFeePerGas || tx.gasPrice ? (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 font-mono">MaxFeePerGas</span>
                                            <span className="font-mono text-sm">
                                                {`${formatEther(BigInt(tx.maxFeePerGas ?? "0x0"))} HAPPY`}
                                            </span>
                                        </div>
                                    ) : null}
                                    {tx.maxPriorityFeePerGas && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600 font-mono">PriorityFee</span>
                                            <span className="font-mono text-sm">
                                                {formatEther(BigInt(tx.maxPriorityFeePerGas))} HAPPY
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-2 border-t border-gray-200 pt-2">
                                    <div className="text-sm text-gray-600 mb-1">Raw Transaction</div>
                                    <pre className="text-xs overflow-x-auto">{JSON.stringify(tx, null, 2)}</pre>
                                </div>
                            </div>
                        </details>
                    </div>
                </div>
            </div>

            <div>
                {user?.email}
                <br />
                {user?.address.slice(0, 8)} ... {user?.address.slice(-8)}
            </div>

            <div className="flex w-full gap-4">
                {/* if blob, show warning */}
                {tx.type === "0x3" && <BlobTxWarning onReject={reject} />}

                <>
                    <button
                        type="button"
                        className="btn grow border-2 border-green-300 bg-green-300 hover:bg-green-400"
                        onClick={() => normalizeAndAcceptTransaction(tx)}
                    >
                        Sign
                    </button>
                    <button
                        type="button"
                        className="btn border-2 border-red-300 bg-red-100 hover:border-red-100 hover:bg-red-100"
                        onClick={reject}
                    >
                        Reject
                    </button>
                </>
            </div>
        </main>
    )
}
