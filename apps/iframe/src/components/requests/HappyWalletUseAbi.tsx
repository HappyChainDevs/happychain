import type { HappyMethodNames } from "@happy.tech/common"
import { useAtomValue } from "jotai"
import { useClassifyAbi } from "#src/hooks/useClassifyAbiSections"
import { currentChainAtom } from "#src/state/chains"
import { Button } from "../primitives/button/Button"
import AbiSection from "./common/AbiSection"
import RawRequestDetails from "./common/RawRequestDetails"
import RequestContent from "./common/RequestContent"
import RequestLayout from "./common/RequestLayout"
import type { RequestConfirmationProps } from "./props"

export function HappyUseAbi({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<typeof HappyMethodNames.USE_ABI>) {
    const chain = useAtomValue(currentChainAtom)
    const classifiedAbi = useClassifyAbi(params.abi)

    return (
        <RequestLayout method={method}>
            <RequestContent>
                <div className="flex flex-col w-full h-full gap-4 rounded-xl p-4">
                    <div className="border-b pb-2 text-center text-sm font-bold text-primary">Details</div>
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-bold text-neutral-content">Address:</span>
                        <a
                            href={`${chain.blockExplorerUrls?.[0]}/address/${params.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-neutral-content text-sm font-mono break-all text-neutral underline hover:text-blue-800"
                        >
                            {params.address}
                        </a>
                    </div>
                    <div className="flex flex-col grow gap-2">
                        <span className="text-sm font-bold text-neutral-content uppercase">abi:</span>
                        {classifiedAbi.map(({ label, items }) => (
                            <AbiSection key={`ABI-${label}`} label={label} abiSection={items} />
                        ))}
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
