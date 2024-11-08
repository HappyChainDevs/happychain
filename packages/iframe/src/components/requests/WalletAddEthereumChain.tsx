import { useState } from "react"
import { requestLabels } from "../../constants/requestLabels"
import { StorageKey, storage } from "../../services/storage"
import type { RequestConfirmationProps } from "./props"

const user = storage.get(StorageKey.HappyUser)

export const WalletAddEthereumChain = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"wallet_addEthereumChain">) => {
    const [chain, setChain] = useState(params[0])

    return (
        <main className="flex h-dvh flex-col items-start justify-between gap-4 bg-base-300 p-4">
            <div className="flex w-full grow flex-col gap-4">
                <div className="w-full rounded-lg bg-base-200 p-4 font-bold">{window.location.origin}</div>
                <div className="w-full rounded-lg bg-base-200 p-4 font-bold">
                    {requestLabels[method] ?? "Unknown Signature Type"}
                </div>

                <div className="flex grow flex-col gap-4 overflow-x-auto bg-zinc-100 p-4">
                    <div className="border-b border-zinc-300 pb-2 text-center text-sm font-bold text-blue-600">
                        Add Chain
                    </div>
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
            </div>

            <div>
                {user?.email}
                <br />
                {user?.address.slice(0, 8)} ... {user?.address.slice(-8)}
            </div>

            <div className="flex w-full gap-4">
                <button
                    type="button"
                    className="btn grow border-2 border-green-300 bg-green-300 hover:bg-green-400"
                    onClick={() => accept({ method, params: [chain] })}
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
