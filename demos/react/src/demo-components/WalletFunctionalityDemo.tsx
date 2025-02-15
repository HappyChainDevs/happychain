import { abis, deployment } from "@happy.tech/contracts/mocks/sepolia"
import { happyChainSepolia } from "@happy.tech/core"
import { useHappyChain } from "@happy.tech/react"
import { toast } from "sonner"
import useClients from "../useClients"

const WalletFunctionalityDemo = () => {
    const { user, showSendScreen, loadAbi } = useHappyChain()
    const { walletClient } = useClients()

    async function sendStub() {
        showSendScreen()
    }

    async function addNewToken() {
        const watchAssetCall = await walletClient?.watchAsset({
            type: "ERC20",
            options: {
                address: deployment.MockTokenA,
                decimals: 18,
                symbol: "MTA",
            },
        })

        if (watchAssetCall) {
            console.log("[addNewToken]: asset being watched")
            toast.success("Asset added succesfully to watchlist!")
        } else {
            console.log("[addNewToken]: Error adding asset ")
            toast.error("Error adding asset, please try again!")
        }
    }

    /** mints 1 MTA token to the connected account */
    async function mintTokens() {
        try {
            if (!walletClient || !user?.address) return
            const [account] = await walletClient.getAddresses()

            const writeCall = await walletClient.writeContract({
                account,
                address: deployment.MockTokenA,
                abi: abis.MockTokenA,
                functionName: "mint",
                args: [user.address, BigInt(1000000000000000000n)],
                chain: happyChainSepolia,
            })

            if (writeCall) {
                console.log("[mintTokens] success:", writeCall)
                toast.success(`Tokens minted successfully! Tx hash: ${writeCall}`)
            } else {
                console.log("[mintTokens] failed; please try again!")
                toast.error("Something went wrong, please try again!")
            }
        } catch (error) {
            console.log("[mintTokens] error caught:", error)
            toast.error("Something went wrong, please try again!")
        }
    }

    async function loadAbiStub() {
        await loadAbi(deployment.HappyCounter, abis.HappyCounter)
        toast.success(`ABI loaded for ${deployment.HappyCounter}`)
    }
    return (
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
    )
}

export default WalletFunctionalityDemo
