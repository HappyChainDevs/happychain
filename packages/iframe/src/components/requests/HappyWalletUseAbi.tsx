import type { WALLET_USE_ABI_RPC_METHOD } from "@happychain/common"
import { useAtomValue } from "jotai"
import { currentChainAtom } from "#src/state/chains"
import { Button } from "../primitives/button/Button"
import RawRequestDetails from "./common/RawRequestDetails"
import RequestContent from "./common/RequestContent"
import RequestLayout from "./common/RequestLayout"
import type { RequestConfirmationProps } from "./props"

export function HappyWalletUseAbi({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<typeof WALLET_USE_ABI_RPC_METHOD>) {
    const chain = useAtomValue(currentChainAtom)

    return (
        <RequestLayout method={method}>
            <RequestContent>
                <div className="flex flex-col w-full h-full gap-4 bg-zinc-100 rounded-xl p-4">
                    <div className="border-b border-zinc-300 pb-2 text-center text-sm font-bold text-blue-600">
                        Details
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-bold text-gray-600">Address:</span>
                        <a
                            href={`${chain.blockExplorerUrls?.[0]}/address/${params.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-neutral text-sm font-mono break-all text-content underline hover:text-blue-800"
                        >
                            {params.address}
                        </a>
                    </div>
                    <div className="flex flex-col grow gap-2">
                        <span className="text-sm font-bold text-gray-600">ABI:</span>
                        <pre className="grow w-full p-2 rounded-lg bg-neutral text-sm font-mono break-all overflow-auto h-[300px]">
                            <code>{JSON.stringify(params?.abi, null, 2)}</code>
                        </pre>
                    </div>

                    <RawRequestDetails params={params} />
                </div>
            </RequestContent>

            <div className="flex flex-col w-full gap-2">
                <Button
                    intent="primary"
                    className="text-neutral-content justify-center"
                    onClick={() => accept({ method, params })}
                >
                    Add ABI
                </Button>
                <Button intent="outline-negative" className="text-base-content justify-center" onClick={reject}>
                    Reject
                </Button>
            </div>
        </RequestLayout>
    )
}
