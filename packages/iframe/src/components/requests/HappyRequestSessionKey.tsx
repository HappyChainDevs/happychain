import type { HappyMethodNames } from "@happychain/common"
import { shortenAddress } from "@happychain/sdk-shared"
import { useAtomValue } from "jotai"
import { useEffect, useState } from "react"
import type { Address, Hex } from "viem"
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
                        <span className="text-content">
                            <span className="text-primary">{appURL}</span> requests permission to automatically approve
                            transactions to{" "}
                            <a
                                href={`${blockExplorerUrl}/address/${targetAddress}?tab=contract`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary border-b border-dashed hover:bg-primary/40"
                            >
                                {shortenAddress(targetAddress)}
                            </a>
                            .
                        </span>
                        <span className="text-sm text-neutral-content/70">
                            <p>You can revoke this permission at any time.</p>
                        </span>
                        <span className="text-sm text-error/70 p-2 rounded-lg bg-error/30 mt-4 w-full">
                            <p className="mb-1">
                                This could result in loss of funds if the contract can access your assets.
                            </p>
                            <p>Only proceed if you trust the application.</p>
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
