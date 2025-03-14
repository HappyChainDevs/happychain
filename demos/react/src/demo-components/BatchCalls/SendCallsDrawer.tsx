import { abis, deployment } from "@happy.tech/contracts/mocks/sepolia"
import { happyChainSepolia } from "@happy.tech/core"
import { useHappyChain } from "@happy.tech/react"
import { AbiFunction, Value } from "ox"
import { useCallback } from "react"
import { toast } from "sonner"
import { Drawer } from "vaul"
import useClients from "../../useClients"

export const SendCallsDrawer = () => {
    const { user } = useHappyChain()
    const { walletClient } = useClients()

    const submitSendCallsHandler = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault()

            const formData = new FormData(e.target as HTMLFormElement)
            const action = formData.get("action") as string | null

            const calls = (() => {
                if (action === "mint")
                    return [
                        {
                            to: deployment.MockTokenA,
                            data: AbiFunction.encodeData(AbiFunction.fromAbi(abis.MockTokenA, "mint"), [
                                user!.address,
                                Value.fromEther("1"),
                            ]),
                        },
                    ]

                // counter
                // mint + counter
                return [] as const
            })()

            const hash = await walletClient?.sendCalls({
                chain: happyChainSepolia,
                account: user!.address,
                calls: calls,
            })

            toast.success(`Bundle submitted successfully with hash: ${hash}`)
        },
        [user, walletClient],
    )
    return (
        <Drawer.Root>
            <Drawer.Trigger className="relative flex h-10 flex-shrink-0 items-center justify-center gap-2 overflow-hidden rounded-lg font-mono bg-sky-300 px-4 text-sm shadow-xl transition-all">
                wallet_sendCalls
            </Drawer.Trigger>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40" />
                <Drawer.Content className="bg-white flex flex-col py-3 space-y-3 w-full fixed bottom-0 left-0 right-0 max-h-[82vh] rounded-lg">
                    <div className="max-w-full mx-auto overflow-auto p-4 rounded-t-[10px]">
                        <Drawer.Handle />
                        <Drawer.Title className="font-medium text-gray-900 mt-8">Select Calls for Batch:</Drawer.Title>
                        <Drawer.Description className="leading-6 mt-2 text-gray-600 italic">
                            Select calls to send via the wallet_sendCalls RPC request
                        </Drawer.Description>
                        <form onSubmit={submitSendCallsHandler}>
                            <div className="">
                                <select name="action" className="w-full h-10 border rounded-xl">
                                    <option value="mint">Mint 1 MTA</option>
                                    <option value="count" disabled>
                                        Increment Counter
                                    </option>
                                    <option value="mint-count" disabled>
                                        Mint 1 MTA + Increment Counter
                                    </option>
                                </select>
                                <button
                                    type="submit"
                                    className="h-[44px] bg-black text-gray-50 rounded-lg mt-4 w-full font-medium"
                                >
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
