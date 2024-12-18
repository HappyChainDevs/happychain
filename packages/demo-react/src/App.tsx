import { chains, useHappyChain } from "@happychain/react"

import { abis, deployment as contractsAddresses } from "@happychain/contracts/mockTokens/sepolia"
import { convertToViemChain } from "@happychain/sdk-shared"
import { useEffect, useMemo, useState } from "react"
import { type Hex, createPublicClient, createWalletClient, custom, erc20Abi, hexToNumber, zeroAddress } from "viem"
import { gnosis } from "viem/chains"
import { ConnectButton } from "./BadgeComponent"

function App() {
    const [signatureResult, setSignatureResult] = useState<string>()
    const [blockResult, setBlockResult] = useState<null | Awaited<ReturnType<typeof publicClient.getBlock>>>()

    const { provider, user, connect, disconnect, showSendScreen, preloadAbi } = useHappyChain()

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

    async function addChain() {
        await walletClient?.addChain({ chain: gnosis })
    }

    async function addConflictedChain() {
        await walletClient?.addChain({ chain: { ...gnosis, name: "Gnosis 2" } })
        console.error("successfully added conflicting chain")
    }

    async function switchChain() {
        await walletClient?.switchChain({ id: gnosis.id })
    }

    async function switchBack() {
        await walletClient?.switchChain({ id: hexToNumber(chains.testnet.chainId as Hex) })
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
            console.log("[addNewToken]: (•̀•́) asset being watched (•̀•́)")
        } else {
            console.log("[addNewToken]: Error adding asset ")
        }
    }

    async function recordAbiStub() {
        preloadAbi(zeroAddress, erc20Abi) // dummy values
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
                chain: convertToViemChain(chains.defaultChain),
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

    useEffect(() => {
        if (!user) {
            setSignatureResult("")
            setBlockResult(null)
        }
    }, [user])

    return (
        <main className='flex min-h-dvh w-full flex-col items-center gap-4 bg-[url("/francesco-ungaro-Wn8JoB8FP70-unsplash.jpg")] bg-cover p-4'>
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

            <div className="max-w-96 w-full overflow-auto bg-gray-200 p-4">
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

            <div className="max-w-96 w-full overflow-auto bg-gray-200 p-4">
                <p className="text-lg font-bold">Results:</p>
                <pre>{signatureResult}</pre>
            </div>

            <button type="button" onClick={getBlock} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                Get Block
            </button>

            <div className="max-w-96 w-full overflow-auto bg-gray-200 p-4">
                <p className="text-lg font-bold">Results:</p>
                <pre>{JSON.stringify(blockResult, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2)}</pre>
            </div>

            <button type="button" onClick={addChain} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                Add Chain
            </button>

            <button type="button" onClick={addConflictedChain} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                Add Conflicted Chain
            </button>

            <button type="button" onClick={switchChain} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                Switch to New Chain
            </button>

            <button type="button" onClick={switchBack} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                Switch Back
            </button>

            <button type="button" onClick={sendStub} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                Show Send Screen
            </button>

            <button type="button" onClick={addNewToken} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                Add Token
            </button>

            <button type="button" onClick={mintTokens} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                Mint Token
            </button>

            <button type="button" onClick={recordAbiStub} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                Record ABI
            </button>
        </main>
    )
}

export default App
