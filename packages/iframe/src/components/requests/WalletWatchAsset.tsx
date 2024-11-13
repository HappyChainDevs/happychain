import { Button } from "../primitives/button/Button"
import RawRequestDetails from "./common/RawRequestDetails"
import RequestContent from "./common/RequestContent"
import RequestLayout from "./common/RequestLayout"
import type { RequestConfirmationProps } from "./props"

export const WalletWatchAsset = ({ method, params, reject, accept }: RequestConfirmationProps<"wallet_watchAsset">) => {
    const { type, options } = params

    return (
        <RequestLayout method={method}>
            <RequestContent>
                <div className="flex grow flex-col gap-4 overflow-y-auto rounded-lg bg-base-200 p-4">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-2xl font-bold">Asset Details</span>
                        </div>
                        <div className="flex flex-col gap-4 rounded-lg bg-base-100 p-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-content">Type:</span>
                                <span className="font-mono text-sm">{type}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-content">Symbol:</span>
                                <span className="font-mono text-sm">{options.symbol}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-content">Contract Address:</span>
                                <span className="font-mono text-sm">{options.address}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-content">Decimals:</span>
                                <span className="font-mono text-sm">{options.decimals}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-content">Image URL:</span>
                                <img src={options.image} alt={"N/A"} className="h-12 w-12 rounded-xl" />
                            </div>

                            <RawRequestDetails params={params} />
                        </div>
                    </div>
                </div>
            </RequestContent>

            <div className="flex w-full gap-4">
                <Button
                    intent="primary"
                    className="grow text-neutral-content justify-center"
                    onClick={() => accept({ method, params })}
                >
                    Add
                </Button>
                <Button intent="outline-negative" className="text-base-content" onClick={reject}>
                    Reject
                </Button>
            </div>
        </RequestLayout>
    )
}
