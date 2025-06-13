import { getCurrentUser } from "@happy.tech/core"
import { useHappyWallet } from "@happy.tech/react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { publicClient, walletClient } from "../clients"

export const RPCCallsDemo = () => {
    const [signDelayCountdown, setSignDelayCountdown] = useState(0)
    const [signatureResult, setSignatureResult] = useState<string>()
    const [blockResult, setBlockResult] = useState<null | Awaited<ReturnType<typeof publicClient.getBlock>>>()
    const [isSigning, setIsSigning] = useState(false)

    const { user } = useHappyWallet()

    async function getBlock() {
        const block = await publicClient.getBlock()
        setBlockResult(block)
    }

    async function signMessage(message: string) {
        setIsSigning(true)
        try {
            setSignatureResult("")

            const signature = await walletClient.signMessage({ message })

            const valid = await publicClient.verifyMessage({
                // We will use `getCurrentUser` here instead of {useHappyWallet().user}
                // since if the user was not connected, they will be prompted to before signing,
                // but the `user` value captured in this function is `undefined`.
                address: getCurrentUser()!.controllingAddress,
                message,
                signature,
            })

            if (!valid) throw new Error("Invalid Signature")

            toast.success(`Message Signed by Wallet: ${message}`)
            setSignatureResult(signature)
        } catch (e) {
            toast.error((e as Error)?.message || "Error signing message")
            setSignatureResult("")
        } finally {
            setIsSigning(false)
        }
    }

    async function signMessageWithDelay(message: string) {
        if (!user) {
            toast.error("no user connected")
            return
        }
        for (let i = 6; i > 0; i--) {
            setSignDelayCountdown(i)
            await new Promise((resolve) => setTimeout(resolve, 1_000))
        }

        setSignDelayCountdown(0)
        return await signMessage(message)
    }

    useEffect(() => {
        if (!user) {
            setSignatureResult("")
            setBlockResult(null)
        }
    }, [user])

    return (
        <div className=" rounded-lg flex flex-col gap-4 p-4 backdrop-blur-sm bg-gray-200/35 col-span-2">
            <div className="text-lg font-bold">RPC Calls</div>
            <div className="grid flex-wrap sm:flex-nowrap gap-4">
                <div className="h-full grid sm:flex gap-4 w-full">
                    <button
                        type="button"
                        disabled={isSigning}
                        onClick={() => signMessage("Hello, World!")}
                        className="rounded-lg bg-sky-300 p-2 shadow-xl whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-gray-300"
                    >
                        Sign Message
                    </button>
                    <button
                        type="button"
                        disabled={isSigning}
                        onClick={() => signMessageWithDelay("Hello, World!")}
                        className="flex  items-center gap-2 rounded-lg bg-sky-300 p-2 shadow-xl whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-gray-300"
                    >
                        {signDelayCountdown || "Sign with Delay"}
                        <small className="text-sm text-gray-700">(for popup blocking)</small>
                    </button>
                </div>
                <div className="w-full overflow-auto grid gap-2">
                    <div className="text-lg grid gap-2 whitespace-nowrap">
                        <p className="font-bold">Raw Message: </p>
                        <div className="flex">
                            <pre className="break-all whitespace-pre-wrap bg-gray-200/25 p-2 rounded-lg">
                                Hello, World!
                            </pre>
                        </div>
                    </div>

                    <div className="text-lg grid gap-2">
                        <p className="font-bold whitespace-nowrap">Signed Message:</p>
                        <pre className="break-all whitespace-pre-wrap bg-gray-200/25 p-2 rounded-lg">
                            {signatureResult || "------"}
                        </pre>
                    </div>
                </div>
            </div>
            <hr className="border-sky-300" />

            <div className="flex flex-col gap-4 ">
                <button
                    type="button"
                    onClick={getBlock}
                    className="rounded-lg bg-sky-300 p-2 shadow-xl whitespace-nowrap w-36"
                >
                    Load Block Info
                </button>

                <div className="w-full overflow-auto max-h-56 ">
                    {blockResult && (
                        <pre className="break-all whitespace-pre-wrap bg-gray-200/25 p-2 rounded-lg">
                            {JSON.stringify(blockResult, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2)}
                        </pre>
                    )}
                </div>
            </div>
        </div>
    )
}
