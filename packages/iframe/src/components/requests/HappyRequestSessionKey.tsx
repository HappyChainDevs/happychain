import type { HappyMethodNames } from "@happychain/common"
import { useAtomValue } from "jotai"
import { useEffect, useState } from "react"
import { type Hex, isHex } from "viem"
import { publicClientAtom } from "#src/state/publicClient"
import { getAppURL } from "#src/utils/appURL.js"
import { shortenAddress } from "@happychain/sdk-shared"
import { Button } from "../primitives/button/Button"
import RequestContent from "./common/RequestContent"
import RequestLayout from "./common/RequestLayout"
import type { RequestConfirmationProps } from "./props"

export function HappyRequestSessionKey({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<typeof HappyMethodNames.HAPPY_SESSION_KEY_RPC_METHOD>) {
    const publicClient = useAtomValue(publicClientAtom)
    const appURL = getAppURL()

    const [bytecode, setBytecode] = useState<Hex | undefined>(undefined)

    useEffect(() => {
        const fetchBytecode = async () => {
            try {
                const code = await publicClient.getCode({ address: params.address })
                setBytecode(code)
            } catch (error) {
                console.error("Error fetching bytecode:", error)
            }
        }

        fetchBytecode()
    }, [publicClient, params.address])

    return (
        <RequestLayout method={method}>
            <RequestContent>
                <div className="flex flex-col items-center justify-between size-full">
                    <div className="flex flex-col grow size-full gap-4 rounded-xl p-4">
                        <div className="flex flex-col items-start justify-start text-content">
                            <span className="text-blue-500 hover:text-purple-500 hover:underline">{appURL}</span>{" "}
                            <span className="italic">
                                requests permission to automatically approve transactions to{" "}
                                <span className="font-medium text-blue-600">{shortenAddress(params.address)}</span>
                            </span>
                        </div>

                        <div className="flex flex-col items-start justify-start text-sm text-gray-600">
                            <span>
                                This allows {appURL.split(".")[0]} to sign transactions on your behalf without
                                additional confirmation prompts. You can revoke this permission at any time.
                            </span>
                        </div>

                        <div className="flex flex-row w-full items-center justify-start gap-x-3 mb-8">
                            <span className="h-4">✅</span>
                            <span className="h-4">
                                {bytecode && isHex(bytecode) ? "Contract deployed" : "Contract code not found."}
                            </span>
                        </div>
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
