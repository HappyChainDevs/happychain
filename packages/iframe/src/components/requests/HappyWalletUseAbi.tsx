import { useAtomValue } from "jotai"
import { requestLabels } from "#src/constants/requestLabels"
import { currentChainAtom } from "#src/state/chains"
import type { RequestConfirmationProps } from "./props"

export function HappyWalletUseAbi({ method, params, reject, accept }: RequestConfirmationProps<"happy_walletUseAbi">) {
    const chain = useAtomValue(currentChainAtom)

    return (
        <main className="flex h-dvh flex-col items-start justify-between gap-4 bg-base-300 p-4">
            <div className="flex w-full grow flex-col gap-4">
                <div className="w-full rounded-lg bg-neutral p-4 font-bold">{window.location.origin}</div>
                <div className="w-full rounded-lg bg-neutral p-4 font-bold">
                    {requestLabels[method] ?? "Unknown Signature Type"}
                </div>

                <div className="flex grow flex-col gap-4 bg-zinc-100 rounded-xl p-4">
                    <div className="border-b border-zinc-300 pb-2 text-center text-sm font-bold text-blue-600">
                        Details
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-bold text-gray-600">Address:</span>
                        <a
                            href={`${chain.blockExplorerUrls?.[0]}/address/${params?.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-neutral text-sm font-mono break-all text-content underline hover:text-blue-800"
                        >
                            {params?.address}
                        </a>
                    </div>
                    <div className="flex flex-col grow gap-2">
                        <span className="text-sm font-bold text-gray-600">ABI:</span>
                        <textarea
                            className="grow w-full p-2 rounded-lg bg-neutral text-sm font-mono break-all overflow-auto resize-none"
                            readOnly
                            value={JSON.stringify(params?.abi, null, 2)} // Formatted JSON
                        />
                    </div>
                </div>
            </div>

            <div className="flex w-full gap-4">
                <button
                    type="button"
                    className="btn grow border-2 bg-success/75"
                    onClick={() => accept({ method: "happy_walletUseAbi", params })}
                >
                    Sign
                </button>
                <button type="button" className="btn border-2 border-red-300 bg-error/75" onClick={reject}>
                    Reject
                </button>
            </div>
        </main>
    )
}
