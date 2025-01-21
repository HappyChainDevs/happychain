import { abis, deployment as contractsAddresses } from "@happychain/contracts/mockTokens/sepolia"
import { happyChainSepolia, happyProvider, useHappyChain } from "@happychain/react"
import { useEffect, useMemo, useState } from "react"
import { createPublicClient, createWalletClient, custom } from "viem"
import { gnosis } from "viem/chains"
import { ConnectButton } from "./BadgeComponent"

function App() {
    const [signatureResult, setSignatureResult] = useState<string>()
    const [blockResult, setBlockResult] = useState<null | Awaited<ReturnType<typeof publicClient.getBlock>>>()

    const { provider, user, connect, disconnect, showSendScreen, loadAbi } = useHappyChain()

    const publicClient = useMemo(() => createPublicClient({ transport: custom(provider!) }), [provider])
    const walletClient = useMemo(
        () => user?.address && createWalletClient({ account: user.address, transport: custom(provider!) }),
        [user, provider],
    )

    async function sendStub() {
        showSendScreen()
    }

    async function signMessage(message: string) {
        if (!user || !walletClient) {
            alert("no user connected")
            return
        }

        setSignatureResult("")

        const signature = await walletClient.signMessage({ message })

        const valid = await publicClient.verifyMessage({
            address: user.controllingAddress,
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

    async function addChain() {
        await walletClient?.addChain({ chain: gnosis })
    }

    async function addConflictedChain() {
        await walletClient?.addChain({ chain: { ...gnosis, name: "Gnosis 2" } })
        console.error("successfully added conflicting chain")
    }

    async function switchChain(chainId: string | number) {
        await walletClient?.switchChain({ id: Number(chainId) })
    }

    async function addNewToken() {
        // https://happy-testnet-sepolia.explorer.caldera.xyz/address/0xc80629fE33747288AaFb97684F86f7eD2D1aBF69
        const watchAssetCall = await walletClient?.watchAsset({
            type: "ERC20",
            options: {
                address: "0xc80629fE33747288AaFb97684F86f7eD2D1aBF69",
                decimals: 18,
                symbol: "MTA",
            },
        })

        if (watchAssetCall) {
            console.log("[addNewToken]: (••) asset being watched (••)")
        } else {
            console.log("[addNewToken]: Error adding asset ")
        }
    }

    async function loadAbiStub() {
        await loadAbi(contractsAddresses.MockTokenA, abis.MockTokenA)
        console.log("ABI loaded!")
    }

    /** mints 1 MTA token to the connected account */
    async function mintTokens() {
        try {
            if (!walletClient || !user?.address) return

            const [account] = await walletClient.getAddresses()
            // cf: https://viem.sh/docs/contract/writeContract.html#usage
            const { request } = await publicClient.simulateContract({
                account,
                address: contractsAddresses.MockTokenA,
                abi: abis.MockTokenA,
                functionName: "mint",
                args: [user.address, BigInt(1000000000000000000n)],
                chain: happyChainSepolia,
            })
            const writeCall = await walletClient.writeContract(request)

            if (writeCall) {
                console.log("[mintTokens] success:", writeCall)
            } else {
                console.log("[mintTokens] failed; please try again!")
            }
        } catch (error) {
            console.log("[mintTokens] error caught:", error)
        }
    }

    async function addSessionKeyToCounterContract() {
        try {
            await happyProvider.request({
                method: "happy_requestSessionKey",
                params: ["0x4F683b24031573AB305ac425c5A7Eb774e5E13DD"],
            })
        } catch (error) {
            console.log(error)
        }
    }

    async function incrementCounter() {}

    useEffect(() => {
        if (!user) {
            setSignatureResult("")
            setBlockResult(null)
        }
    }, [user])

    return (
        <main className='flex min-h-dvh w-full flex-col items-center gap-4 bg-[url("/francesco-ungaro-Wn8JoB8FP70-unsplash.jpg")] bg-cover p-4'>
            <h1 className="p-16 text-4xl font-bold text-white">HappyChain + TS + React + Viem</h1>

            <div className="flex flex-col md:grid grid-cols-2 gap-4 w-full md:max-w-screen-lg">
                <div className="rounded-lg flex flex-col gap-4 p-4 backdrop-blur-sm bg-gray-200/35 col-span-2">
                    <div className="text-lg font-bold">Connection Methods</div>

                    <div className="flex gap-4">
                        <div className="flex flex-col h-full justify-between">
                            <button
                                type="button"
                                onClick={() => (user ? disconnect() : connect())}
                                className="rounded-lg bg-sky-300 p-2 shadow-xl"
                            >
                                {user ? "Disconnect" : "Connect"}
                            </button>
                            <small>Custom Button</small>
                        </div>

                        <span className="border border-gray-200/35" />

                        <div className="flex flex-col h-full justify-between">
                            <ConnectButton />
                            <small>Default Badge</small>
                        </div>
                    </div>
                </div>

                <div className="overflow-auto backdrop-blur-sm bg-gray-200/35 col-span-2 p-4 flex flex-col gap-4 rounded-lg">
                    <p className="text-lg font-bold">User Details</p>
                    <pre>{JSON.stringify(user, null, 2)}</pre>
                </div>

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
                                Get Block
                            </button>
                        </div>

                        <div className="w-full overflow-auto">
                            <p className="text-lg font-bold">Results:</p>
                            <pre className="max-h-48 overflow-auto w-full">
                                {blockResult
                                    ? JSON.stringify(
                                          blockResult,
                                          (_, v) => (typeof v === "bigint" ? v.toString() : v),
                                          2,
                                      )
                                    : ""}
                            </pre>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 backdrop-blur-sm bg-gray-200/35 p-4 rounded-lg">
                    <div className="text-lg font-bold col-span-2">Chain Switching</div>

                    <button type="button" onClick={addChain} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                        Add Gnosis
                    </button>

                    <button
                        type="button"
                        onClick={addConflictedChain}
                        className="rounded-lg bg-sky-300 p-2 shadow-xl whitespace-nowrap"
                    >
                        Add "Gnosis 2"
                        <small>(creates conflict)</small>
                    </button>

                    <button
                        type="button"
                        onClick={() => switchChain(gnosis.id)}
                        className="rounded-lg bg-sky-300 p-2 shadow-xl"
                    >
                        Switch to Gnosis
                    </button>

                    <button
                        type="button"
                        onClick={() => switchChain(happyChainSepolia.id)}
                        className="rounded-lg bg-sky-300 p-2 shadow-xl"
                    >
                        Switch to HappyChain Sepolia
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4 backdrop-blur-sm bg-gray-200/35 p-4 rounded-lg">
                    <div className="text-lg font-bold col-span-2">Wallet Functionality</div>
                    <button type="button" onClick={sendStub} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                        Show Send Screen
                    </button>

                    <div className="flex flex-row w-full items-center justify-center space-x-6">
                        <button type="button" onClick={addNewToken} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                            Add Token
                        </button>

                        <button type="button" onClick={mintTokens} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                            Mint Token
                        </button>
                    </div>
                    <button type="button" onClick={loadAbiStub} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                        Load ABI
                    </button>
                </div>
            </div>
        </main>
    )
}

export default App
