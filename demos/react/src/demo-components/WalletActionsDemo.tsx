import { loadAbi, showSendScreen } from "@happy.tech/core"
import { AddressBookIcon, CoinVerticalIcon, HandCoinsIcon, MathOperationsIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { walletClient } from "../clients"
import { abis, deployment } from "../deployments"

export const WalletActionsDemo = () => {
    async function addNewToken() {
        const symbol = "MTA" // MockTokenA symbol
        try {
            await walletClient.watchAsset({
                type: "ERC20",
                options: {
                    address: deployment.MockTokenA,
                    decimals: 18,
                    symbol,
                },
            })

            console.log("[addNewToken]: asset being watched")
            toast.success(
                <div>
                    Asset added successfully to watchlist! Open your wallet to track the balance of ${symbol} as you
                    mint
                </div>,
            )
        } catch (error) {
            // error case reached if we append a meaningless string to the token address, say `+ "12345"`
            console.log("[addNewToken]: Error adding asset.", error)
            toast.error(<div>Error adding ${symbol}, please try again!</div>)
        }
    }

    async function loadCounterAbi() {
        await loadAbi(deployment.HappyCounter, abis.HappyCounter)
        toast.success(
            <div>
                ABI loaded for <pre className="w-full">{deployment.HappyCounter}</pre> Click on the Counter ++ button
                without an active session key to see the ABI in use within the request popup.`,
            </div>,
        )
    }

    async function loadTokenAbi() {
        await loadAbi(deployment.MockTokenA, abis.MockTokenA)
        toast.success(
            <div>
                ABI loaded for <pre className="w-full">{deployment.MockTokenA}</pre> Mint some tokens without an active
                session key to see the ABI in use within the request popup.`,
            </div>,
        )
    }

    return (
        <div className="flex flex-col gap-4 backdrop-blur-sm bg-gray-200/35 p-4 rounded-lg">
            <div className="text-lg font-bold col-span-2">Wallet Actions</div>
            <div className="grid sm:grid-cols-2 gap-4">
                <button
                    type="button"
                    onClick={addNewToken}
                    className="rounded-lg bg-sky-300 p-2 shadow-xl flex items-center gap-2"
                >
                    <AddressBookIcon />
                    Watch Token
                </button>
                <button
                    type="button"
                    onClick={showSendScreen}
                    className="rounded-lg bg-sky-300 p-2 shadow-xl flex items-center gap-2"
                >
                    <HandCoinsIcon />
                    Send $HAPPY
                </button>
                <button
                    type="button"
                    onClick={loadCounterAbi}
                    className="rounded-lg bg-sky-300 p-2 shadow-xl flex items-center gap-2"
                >
                    <MathOperationsIcon />
                    Load Counter ABI
                </button>
                <button
                    type="button"
                    onClick={loadTokenAbi}
                    className="rounded-lg bg-sky-300 p-2 shadow-xl flex items-center gap-2"
                >
                    <CoinVerticalIcon />
                    Load Token ABI
                </button>
            </div>
        </div>
    )
}
