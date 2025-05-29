import { loadAbi, showSendScreen } from "@happy.tech/core"
import { useHappyWallet } from "@happy.tech/react"
import { toast } from "sonner"
import { parseEther } from "viem"
import { walletClient } from "../clients"
import { abis, deployment } from "../deployments"

const WalletFunctionalityDemo = () => {
    const { user } = useHappyWallet()

    async function addNewToken() {
        try {
            await walletClient.watchAsset({
                type: "ERC20",
                options: {
                    address: deployment.MockTokenA,
                    decimals: 18,
                    symbol: "MTA",
                },
            })

            console.log("[addNewToken]: asset being watched")
            toast.success("Asset added successfully to watchlist!")
        } catch (error) {
            // error case reached if we append a meaningless string to the token address, say `+ "12345"`
            toast.error("Error adding asset, please try again!")
            console.log("[addNewToken]: Error adding asset.", error)
        }
    }

    /** mints 1 MTA token to the connected account */
    async function mintTokens() {
        try {
            if (!user?.address) return
            const writeCallResult = await walletClient.writeContract({
                address: deployment.MockTokenA,
                abi: abis.MockTokenA,
                functionName: "mint",
                args: [user.address, 1000000000000000000n],
            })
            if (writeCallResult) {
                console.log("[mintTokens] success:", writeCallResult)
                toast.success(
                    <div>
                        Tokens minted successfully! {/* BoopHash URL unavailable */}
                        {/* <a
                            href={`https://explorer.testnet.happy.tech/boop/${writeCallResult}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "underline" }}
                        >
                            View on Explorer
                        </a> */}
                    </div>,
                )
            } else {
                console.log("[mintTokens] failed; please try again!")
                toast.error("Something went wrong, please try again!")
            }
        } catch (error) {
            console.log("[mintTokens] error caught:", error)
            toast.error("Something went wrong, please try again!")
        }
    }

    async function sendBatch() {
        try {
            const batchCalls = await walletClient?.sendCalls({
                account: user?.address,
                calls: [
                    {
                        to: "0x77e351bd9C2EF18aB7070f37a5A8108279553F91",
                        value: parseEther("0.001"),
                    },
                ],
            })
            console.log(batchCalls)
        } catch (error) {
            console.error(error)
        }
    }

    async function loadAbiStub() {
        await loadAbi(deployment.MockTokenA, abis.MockTokenA)
        toast.success(
            `ABI loaded for ${deployment.MockTokenA}! Click on the Mint Token button to see the ABI in use within the request popup.`,
        )
    }

    return (
        <div className="grid grid-cols-2 gap-4 backdrop-blur-sm bg-gray-200/35 p-4 rounded-lg">
            <div className="text-lg font-bold col-span-2">Wallet Functionality</div>
            <button type="button" onClick={showSendScreen} className="rounded-lg bg-sky-300 p-2 shadow-xl">
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
            <button type="button" onClick={sendBatch} className="rounded-lg bg-amber-300 font-mono p-2 shadow-xl">
                wallet_sendCalls
            </button>
        </div>
    )
}

export default WalletFunctionalityDemo
