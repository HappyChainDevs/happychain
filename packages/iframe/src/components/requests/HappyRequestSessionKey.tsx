import type { HappyMethodNames } from "@happychain/common"
import { shortenAddress } from "@happychain/sdk-shared"
import { useAtomValue } from "jotai"
import { useEffect, useState } from "react"
import { type Address, type Hex } from "viem"
import { currentChainAtom } from "#src/state/chains"
import { publicClientAtom } from "#src/state/publicClient"
import { getAppURL } from "#src/utils/appURL.js"
import { Button } from "../primitives/button/Button"
import RequestContent from "./common/RequestContent"
import RequestLayout from "./common/RequestLayout"
import type { RequestConfirmationProps } from "./props"

export function HappyRequestSessionKey({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<typeof HappyMethodNames.REQUEST_SESSION_KEY>) {
    const targetAddress: Address = params[0]
    const publicClient = useAtomValue(publicClientAtom)
    const currentChain = useAtomValue(currentChainAtom)
    const blockExplorerUrl = currentChain.blockExplorerUrls ? currentChain.blockExplorerUrls[0] : ""

    const appURL = getAppURL()

    const [_bytecode, setBytecode] = useState<Hex | undefined>(undefined)

    useEffect(() => {
        const fetchBytecode = async () => {
            try {
                const code = await publicClient.getCode({ address: targetAddress })
                setBytecode(code)
            } catch (error) {
                console.error("Error fetching bytecode:", error)
            }
        }

        fetchBytecode()
    }, [publicClient, targetAddress])

    return (
        <RequestLayout method={method}>
            <RequestContent>
                <div className="flex flex-col size-full items-center justify-center">
                    <div className="flex flex-col size-full items-start justify-start py-4 gap-y-3">
                        <span className="text-content italic">
                            <span className="text-primary not-italic">{appURL}</span> requests permission to
                            automatically approve transactions to{" "}
                            <div className="tooltip" data-tip={targetAddress}>
                                <a
                                    href={`${blockExplorerUrl}/address/${targetAddress}?tab=contract`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary p-1 text-[15px] hover:underline rounded-lg border border-dashed hover:bg-primary/40"
                                >
                                    {shortenAddress(targetAddress)}
                                </a>
                            </div>
                        </span>
                        <span className="text-sm text-neutral-content/70">
                            This allows {appURL.split(".")[0]} to sign and send transactions on your behalf without
                            additional confirmation prompts. <br /> <br /> You can revoke this permission at any time.
                        </span>
                    </div>
                    <div className="flex flex-col w-full gap-2">
                        <Button
                            intent="primary"
                            className="text-neutral-content justify-center"
                            onClick={() => accept({ method, params })}
                        >
                            Approve
                        </Button>
                        <Button intent="ghost" className="text-base-content justify-center" onClick={reject}>
                            Reject
                        </Button>
                    </div>
                </div>
            </RequestContent>
        </RequestLayout>
    )
}
