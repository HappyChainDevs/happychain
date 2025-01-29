import { happyChainSepolia } from "@happychain/react"
import { toast } from "sonner"
import { gnosis } from "viem/chains"
import useClients from "../useClients"

const ChainSwitchingDemo = () => {
    const { walletClient } = useClients()

    async function addChain() {
        await walletClient?.addChain({ chain: gnosis })
    }
    async function addConflictedChain() {
        await walletClient?.addChain({ chain: { ...gnosis, name: "Gnosis 2" } })
        console.error("successfully added conflicting chain")
        toast.error("(!!) Added conflicting chain (!!)")
    }

    async function switchChain(chainId: string | number) {
        await walletClient?.switchChain({ id: Number(chainId) })
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
                className="rounded-lg bg-sky-300 p-2 shadow-xl whitespace-nowrap truncate"
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
    )
}

export default ChainSwitchingDemo
