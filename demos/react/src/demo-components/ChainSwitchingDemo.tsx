import { happyChainSepolia } from "@happy.tech/core"
import { toast } from "sonner"
import { gnosis } from "viem/chains"
import useClients from "../useClients"

const ChainSwitchingDemo = () => {
    const { walletClient } = useClients()

    async function addChain() {
        await walletClient?.addChain({ chain: gnosis })
        toast.success(`Chain details added: ${gnosis.id}.`)
    }
    async function addConflictedChain() {
        try {
            await walletClient?.addChain({ chain: { ...gnosis, name: "Gnosis 2" } })
            toast.success(`Chain details added: ${gnosis.id}.`)
        } catch (error) {
            console.error("[addConflictedChain]:", error)
            toast.error("Error adding conflicting chain, already added.")
        }
    }

    async function switchChain(chainId: string | number) {
        await walletClient?.switchChain({ id: Number(chainId) })
        toast.success(`Chains switched successfully to chainID: ${chainId}.`)
    }

    return (
        <div className="grid grid-cols-2 gap-4 backdrop-blur-sm bg-gray-200/35 p-4 rounded-lg">
            <div className="text-lg font-bold col-span-2">Chain Switching</div>

            <button type="button" onClick={addChain} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                Add Gnosis
            </button>

            <button
                type="button"
                onClick={addConflictedChain}
                className="rounded-lg bg-sky-300 p-2 shadow-xl text-center"
            >
                Add "Gnosis 2"
                <small className="block text-sm text-gray-700">(creates conflict)</small>
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
    )
}

export default ChainSwitchingDemo
