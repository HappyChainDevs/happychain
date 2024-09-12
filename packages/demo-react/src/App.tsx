import { useHappyChain } from "@happychain/react"

import { useEffect, useMemo, useState } from "react"
import { createPublicClient, createWalletClient, custom } from "viem"
import { ConnectButton } from "./BadgeComponent"

function App() {
    const [signatureResult, setSignatureResult] = useState<string>()
    const [blockResult, setBlockResult] = useState<null | Awaited<ReturnType<typeof publicClient.getBlock>>>()

    const { provider, user, connect, disconnect, showSendScreen } = useHappyChain()

    const publicClient = useMemo(() => createPublicClient({ transport: custom(provider) }), [provider])
    const walletClient = useMemo(
        () => user?.address && createWalletClient({ account: user.address, transport: custom(provider) }),
        [user, provider],
    )

    async function signMessage(message: string) {
        if (!user || !walletClient) {
            alert("no user connected")
            return
        }
        setSignatureResult("")

        const signature = await walletClient.signMessage({ message })

        const valid = await publicClient.verifyMessage({
            address: user.address,
            message,
            signature,
        })

        if (valid) {
            setSignatureResult(signature)
        }
    }

    async function getBlock() {
        const block = await publicClient.getBlock()
        setBlockResult(block)
    }

    async function sendStub() {
        showSendScreen()
    }

    useEffect(() => {
        if (!user) {
            setSignatureResult("")
            setBlockResult(null)
        }
    }, [user])

    return (
        <main className='flex min-h-dvh w-full flex-col items-center gap-4 bg-[url("/francesco-ungaro-Wn8JoB8FP70-unsplash.jpg")] bg-[100vw_auto] p-4'>
            <h1 className="p-16 text-4xl font-bold text-white">HappyChain + TS + React + Viem</h1>

            <button
                type="button"
                onClick={() => {
                    user ? disconnect() : connect()
                }}
                className="rounded-lg bg-sky-300 p-2 shadow-xl"
            >
                {user ? "Disconnect" : "Connect"}
            </button>

            <ConnectButton />

            <ConnectButton disableStyles={true} />

            <div className="w-96 overflow-auto bg-gray-200 p-4">
                <p className="text-lg font-bold">User Details</p>
                <pre>{JSON.stringify(user, null, 2)}</pre>
            </div>

            <button
                type="button"
                onClick={() => signMessage("Hello, World!")}
                className="rounded-lg bg-sky-300 p-2 shadow-xl"
            >
                Sign Message
            </button>

            <div className="w-96 overflow-auto bg-gray-200 p-4">
                <p className="text-lg font-bold">Results:</p>
                <pre>{signatureResult}</pre>
            </div>

            <button type="button" onClick={getBlock} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                Get Block
            </button>
            <div className="w-96 overflow-auto bg-gray-200 p-4">
                <p className="text-lg font-bold">Results:</p>
                <pre>{JSON.stringify(blockResult, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2)}</pre>
            </div>

            <button type="button" onClick={sendStub} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                Send
            </button>
        </main>
    )
}

export default App
