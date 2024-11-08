import { requestLabels } from "#src/constants/requestLabels.js"
import type { RequestConfirmationProps } from "./props"

export const WalletWatchAsset = ({ method, params, reject, accept }: RequestConfirmationProps<"wallet_watchAsset">) => {
    const { type, options } = params

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
                            <span className="text-xl font-semibold">Asset Details</span>
                        </div>
                        <div className="flex flex-col gap-4 rounded-lg bg-base-100 p-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-content">Type:</span>
                                <span className="font-mono text-sm">{type || "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-content">Symbol:</span>
                                <span className="font-mono text-sm">{options.symbol || "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-content">Contract Address:</span>
                                <span className="font-mono text-sm">{options.address || "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-content">Decimals:</span>
                                <span className="font-mono text-sm">{options.decimals || "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-content">Image URL:</span>
                                <img src={options.image} alt={"N/A"} className="h-12 w-12 rounded-xl" />
                            </div>

                            <div className="mt-2 border-t border-gray-200 pt-2">
                                <div className="text-sm text-neutral-content mb-1">Raw Transaction</div>
                                <pre className="text-xs overflow-x-auto">{JSON.stringify(options, null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex w-full gap-4">
                <button
                    type="button"
                    className="btn grow border-2 border-green-300 bg-green-300 hover:bg-green-400"
                    onClick={() => accept({ method, params })}
                >
                    Add
                </button>
                <button
                    type="button"
                    className="btn border-2 border-red-300 bg-red-100 hover:border-red-100 hover:bg-red-100"
                    onClick={reject}
                >
                    Cancel
                </button>
            </div>
        </main>
    )
}
