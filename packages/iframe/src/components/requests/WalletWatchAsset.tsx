import type { RequestConfirmationProps } from "./props"

export function WatchAsset({ method, params, reject, accept }: RequestConfirmationProps<"wallet_watchAsset">) {
    const { type, options } = params

    return (
        <main className="flex h-dvh flex-col items-start justify-between gap-4 bg-base-300 p-4">
            <div className="flex w-full grow flex-col gap-4">
                <div className="w-full rounded-lg bg-base-200 p-4 font-bold">{window.location.origin}</div>

                <div className="flex grow flex-col gap-4 bg-zinc-100 p-4">
                    <div className="border-b border-zinc-300 pb-2 text-center text-sm font-bold text-blue-600">
                        Asset Details
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                        <div className="font-bold">Type:</div>
                        <div>{type || "N/A"}</div>
                    </div>
                    {options && (
                        <div className="flex flex-col gap-2 text-sm">
                            <div className="font-bold">Options:</div>
                            <div>
                                <span className="font-semibold">Address:</span> {options.address || "N/A"}
                            </div>
                            <div>
                                <span className="font-semibold">Decimals:</span> {options.decimals ?? "N/A"}
                            </div>
                            <div>
                                <span className="font-semibold">Symbol:</span> {options.symbol || "N/A"}
                            </div>
                            <div className="flex flex-row h-16 items-center justify-start space-x-2">
                                <span className="font-semibold">Image URL:</span>
                                <img src={options.image} alt={"N/A"} className="h-12 w-12 rounded-xl" />
                            </div>
                        </div>
                    )}
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
