import { useHappyWallet } from "@happy.tech/react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { publicClient, walletClient } from "../clients"

const WalletCallsDemo = () => {
    const [signDelayCountdown, setSignDelayCountdown] = useState(0)
    const [signatureResult, setSignatureResult] = useState<string>()
    const [blockResult, setBlockResult] = useState<null | Awaited<ReturnType<typeof publicClient.getBlock>>>()

    const { user } = useHappyWallet()

    async function getBlock() {
        const block = await publicClient.getBlock()
        setBlockResult(block)
    }

    async function signMessage(message: string) {
        if (!user) {
            toast.error("no user connected")
            return
        }

        setSignatureResult("")

        const signature = await walletClient.signMessage({ message })

        const valid = await publicClient.verifyMessage({
            address: user?.controllingAddress,
            message,
            signature,
        })

        if (!valid) {
            toast.error("Invalid Signature")
            return
        }

        toast.success(`Message Signed by Wallet: ${message}`)
        setSignatureResult(signature)
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
            <div className="flex gap-4">
                <div className="h-full flex flex-col gap-4">
                    <button
                        type="button"
                        onClick={() => signMessage("Hello, World!")}
                        className="rounded-lg bg-sky-300 p-2 shadow-xl whitespace-nowrap w-36"
                    >
                        Sign Message
                    </button>
                    <button
                        type="button"
                        onClick={() => signMessageWithDelay("Hello, World!")}
                        className="rounded-lg bg-sky-300 p-2 shadow-xl whitespace-nowrap w-36"
                    >
                        {signDelayCountdown || "Sign with Delay"}
                        <small className="block text-sm text-gray-700">(for popup blocking)</small>
                    </button>
                </div>
                <div className="w-full overflow-auto">
                    <div className="text-lg flex gap-2 whitespace-nowrap">
                        <p className="font-bold">Raw Message: </p>
                        <pre>Hello, World!</pre>
                    </div>

                    <div className="text-lg flex gap-2 whitespace-nowrap">
                        <p className="font-bold">Signed Message:</p>
                        <pre className="overflow-auto">{signatureResult}</pre>
                    </div>
                </div>
            </div>
            <hr />

            <div className="flex gap-4 ">
                <div className="h-full">
                    <button
                        type="button"
                        onClick={getBlock}
                        className="rounded-lg bg-sky-300 p-2 shadow-xl whitespace-nowrap w-36"
                    >
                        Get Block Info
                    </button>
                </div>

                <div className="w-full overflow-auto">
                    <p className="text-lg font-bold">Results:</p>
                    <pre className="max-h-48 overflow-auto w-full">
                        {blockResult
                            ? JSON.stringify(blockResult, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2)
                            : ""}
                    </pre>
                </div>
            </div>
        </div>
    )
}

export default WalletCallsDemo
