import { useState } from "react"
import { Button } from "../primitives/button/Button"
import RawRequestDetails from "./common/RawRequestDetails"
import RequestContent from "./common/RequestContent"
import RequestLayout from "./common/RequestLayout"
import type { RequestConfirmationProps } from "./props"

export const WalletAddEthereumChain = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"wallet_addEthereumChain">) => {
    const [chain, setChain] = useState(params[0])

    return (
        <RequestLayout method={method}>
            <RequestContent>
                {/* Chain Details Form */}
                <div className="flex flex-col gap-4 rounded-lg bg-base-100 p-4">
                    <label className="grid">
                        Chain ID
                        <input className="rounded px-4 py-2" disabled value={Number(chain.chainId)} />
                    </label>
                    <label className="grid">
                        Network Name
                        <input
                            onChange={(e) => {
                                setChain((old) => ({ ...old, chainName: e.target.value }))
                            }}
                            className="rounded px-4 py-2"
                            value={chain.chainName}
                        />
                    </label>
                    <label className="grid">
                        RPC URL
                        <input
                            onChange={(e) => {
                                setChain((old) => ({ ...old, rpcUrls: [e.target.value] }))
                            }}
                            className="rounded px-4 py-2"
                            value={chain.rpcUrls[0] ?? ""}
                        />
                    </label>
                    <label className="grid">
                        Currency Symbol
                        <input
                            onChange={(e) => {
                                setChain((old) => ({
                                    ...old,
                                    nativeCurrency: {
                                        name: e.target.value ?? "",
                                        symbol: e.target.value,
                                        decimals: 18,
                                    },
                                }))
                            }}
                            className="rounded px-4 py-2"
                            value={chain.nativeCurrency?.symbol ?? ""}
                        />
                    </label>
                    <label className="grid">
                        Block Explorer (optional)
                        <input
                            onChange={(e) => {
                                setChain((old) => ({
                                    ...old,
                                    blockExplorerUrls: e.target.value ? [e.target.value] : undefined,
                                }))
                            }}
                            className="rounded px-4 py-2"
                            value={chain.blockExplorerUrls?.[0] ?? ""}
                        />
                    </label>
                </div>
                <RawRequestDetails params={[chain]} />
            </RequestContent>

            <div className="flex w-full gap-4">
                <Button
                    intent="primary"
                    className="grow text-neutral-content justify-center"
                    onClick={() => accept({ method, params: [chain] })}
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
