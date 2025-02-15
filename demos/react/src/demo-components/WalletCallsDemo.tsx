import { useHappyChain } from "@happy.tech/react"
import { useEffect, useState } from "react"
import useClients from "../useClients"

const WalletCallsDemo = () => {
    const [signatureResult, setSignatureResult] = useState<string>()
    const [blockResult, setBlockResult] = useState<null | Awaited<ReturnType<typeof publicClient.getBlock>>>()

    const { user } = useHappyChain()
    const { walletClient, publicClient } = useClients()

    async function getBlock() {
        const block = await publicClient.getBlock()
        setBlockResult(block)
    }

    async function signMessage(message: string) {
        if (!user || !walletClient) {
            alert("no user connected")
            return
        }

        setSignatureResult("")

        const signature = await walletClient.signMessage({ account: user.address, message })

        const valid = await publicClient!.verifyMessage({
            address: user.controllingAddress,
            message,
            signature,
        })

        if (valid) {
            setSignatureResult(signature)
        }
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
                <div className="h-full">
                    <button
                        type="button"
                        onClick={() => signMessage("Hello, World!")}
                        className="rounded-lg bg-sky-300 p-2 shadow-xl whitespace-nowrap w-36"
                    >
                        Sign Message
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
