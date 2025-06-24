import { happyChainSepolia } from "@happy.tech/core"
import { toast } from "sonner"
import { gnosis } from "viem/chains"
import GnosisLogo from "../assets/gnosis-logo.svg"
import UnknownLogo from "../assets/unknown-logo.png"
import { walletClient } from "../clients"

export const ChainSwitchingDemo = () => {
    async function addChain() {
        await walletClient.addChain({ chain: gnosis })
        toast.success(`Chain details added: ${gnosis.id}.`)
    }
    async function addConflictedChain() {
        try {
            await walletClient.addChain({ chain: { ...gnosis, name: "Gnosis 2" } })
            toast.success(`Chain details added: ${gnosis.id}.`)
        } catch (error) {
            console.error("[addConflictedChain]:", error)
            toast.error("Error adding conflicting chain, already added.")
        }
    }

    async function switchChain(chainId: string | number) {
        try {
            await walletClient.switchChain({ id: Number(chainId) })
            toast.success(`Chains switched successfully to chainID: ${chainId}.`)
        } catch (error) {
            console.error("[switchChain]:", error)
            const msg = error instanceof Error ? error.message : undefined
            toast.error(`Error switching chains${msg ? `: ${msg}` : ""}`)
        }
    }

    return (
        <div className="flex flex-col gap-4 backdrop-blur-sm bg-gray-200/35 p-4 rounded-lg">
            <div className="text-lg font-bold col-span-2">Chain Switching</div>

            <div className="grid grid-cols-2 grid-flow-row gap-4">
                <button
                    type="button"
                    onClick={addChain}
                    className="rounded-lg bg-sky-300 p-2 shadow-xl flex items-center gap-2"
                >
                    <img src={UnknownLogo} alt="Unknown Chain Logo" className="inline-block ml-2 h-6 w-6" />
                    Add Anvil
                </button>

                <button
                    type="button"
                    onClick={() => switchChain(gnosis.id)}
                    className="rounded-lg bg-sky-300 p-2 shadow-xl flex items-center gap-2"
                >
                    <img src={UnknownLogo} alt="Unknown Chain Logo" className="inline-block ml-2 h-6 w-6" />
                    Switch to Anvil
                </button>

                <button
                    type="button"
                    onClick={addChain}
                    className="rounded-lg bg-sky-300 p-2 shadow-xl flex items-center gap-2"
                >
                    <img src={GnosisLogo} alt="Gnosis Logo" className="inline-block ml-2 h-6 w-6" />
                    Add Gnosis
                </button>

                <button
                    type="button"
                    onClick={() => switchChain(gnosis.id)}
                    className="rounded-lg bg-sky-300 p-2 shadow-xl flex items-center gap-2"
                >
                    <img src={GnosisLogo} alt="Gnosis Logo" className="inline-block ml-2 h-6 w-6" />
                    Switch to Gnosis
                </button>

                <button
                    type="button"
                    onClick={addConflictedChain}
                    className="rounded-lg bg-sky-300 p-2 shadow-xl flex items-center gap-2 text-left"
                >
                    <img src={GnosisLogo} alt="Gnosis Logo" className="inline-block ml-2 h-6 w-6" />
                    <div title="This will create a conflict for the chain ID">
                        <div>Add Gnosis Alt</div>
                        <small className="opacity-50">(Should Detect Changes)</small>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => switchChain(happyChainSepolia.id)}
                    className="rounded-lg bg-sky-300 p-2 shadow-xl flex items-center gap-2 text-left"
                >
                    <img
                        src={"https://iframe.happy.tech/images/happychainLogoSimple.png"}
                        alt="HappyChain Logo"
                        className="inline-block ml-2 h-6 w-6"
                    />
                    <div>
                        <p>Switch to HappyChain</p>
                        <small className="opacity-50">(HappyChain Sepolia)</small>
                    </div>
                </button>
            </div>
        </div>
    )
}
