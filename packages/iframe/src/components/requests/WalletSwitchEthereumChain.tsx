import { useAtomValue } from "jotai"

import { chainsAtom } from "#src/state/chains.js"
import { Button } from "../primitives/button/Button"
import RawRequestDetails from "./common/RawRequestDetails"
import RequestContent from "./common/RequestContent"
import RequestLayout from "./common/RequestLayout"
import type { RequestConfirmationProps } from "./props"

export const WalletSwitchEthereumChain = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"wallet_switchEthereumChain">) => {
    const chains = useAtomValue(chainsAtom)
    const chain = chains[params[0].chainId]

    if (!chain) {
        return (
            <RequestLayout method={method}>
                <span className="text-2xl font-bold">
                    Failed to find details for chain ID: <span className="font-mono">{params[0].chainId}</span>
                </span>

                <Button intent="outline-negative" className="text-base-content w-full justify-center" onClick={reject}>
                    Cancel
                </Button>
            </RequestLayout>
        )
    }
    return (
        <RequestLayout method={method}>
            <RequestContent>
                <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl font-bold">Switch Chain</span>
                </div>

                <div className="flex flex-col gap-4 rounded-lg bg-base-100 p-4">
                    <div className="flex justify-between">
                        <span className="text-sm text-neutral-content">New Chain:</span>
                        <span className="font-mono text-sm">{chain.chainName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-neutral-content">Chain ID:</span>
                        <span className="font-mono text-sm">{chain.chainId}</span>
                    </div>

                    <RawRequestDetails params={params} />
                </div>
            </RequestContent>

            <div className="flex w-full gap-4">
                <Button
                    intent="primary"
                    className="grow text-neutral-content justify-center"
                    onClick={() => accept({ method, params })}
                >
                    Switch
                </Button>
                <Button intent="outline-negative" className="text-base-content" onClick={reject}>
                    Cancel
                </Button>
            </div>
        </RequestLayout>
    )
}
