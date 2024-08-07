import { useEffect, useMemo, useState } from 'react'

import { HappyWallet, useHappyChain } from '@happychain/react'
import { createPublicClient, createWalletClient, custom } from 'viem'

function App() {
    const [signatureResult, setSignatureResult] = useState<string>()
    const [blockResult, setBlockResult] = useState<null | Awaited<ReturnType<typeof publicClient.getBlock>>>()

    const { provider, user } = useHappyChain()

    const publicClient = useMemo(() => createPublicClient({ transport: custom(provider) }), [provider])
    const walletClient = useMemo(
        () => (user?.address ? createWalletClient({ account: user.address, transport: custom(provider) }) : null),
        [user, provider],
    )

    async function signMessage() {
        setSignatureResult('')
        if (!walletClient) {
            console.warn('no wallet client connected')
            return
        }

        if (!user) {
            console.warn('no user connected')
            return
        }

        const message = 'Hello'

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

    useEffect(() => {
        if (!user) {
            setSignatureResult('')
            setBlockResult(null)
        }
    }, [user])

    return (
        <main className="flex min-h-dvh w-full flex-col items-center gap-4 bg-[url('/francesco-ungaro-Wn8JoB8FP70-unsplash.jpg')] bg-[100vw_auto] p-4">
            <br />

            <div className="w-96 overflow-auto bg-gray-200 p-4">
                <p className="text-lg font-bold">User Details</p>
                <pre>{JSON.stringify(user, null, 2)}</pre>
            </div>

            <button type="button" onClick={signMessage} className="rounded-lg bg-sky-300 p-2 shadow-xl">
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
                <pre>{JSON.stringify(blockResult, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2)}</pre>
            </div>

            <HappyWallet />
        </main>
    )
}

export default App
