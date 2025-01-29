import { abis, deployment } from "@happy.tech/contracts/mocks/sepolia"
import { happyChainSepolia } from "@happy.tech/core"
import { ConnectButton, useHappyChain } from "@happy.tech/react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { createPublicClient, createWalletClient, custom } from "viem"
import { gnosis } from "viem/chains"
import { ConnectButton } from "./BadgeComponent"
import ChainSwitchingDemo from "./demo-components/ChainSwitchingDemo"
import ConnectionDemo from "./demo-components/ConnectionDemo"
import SessionKeyDemo from "./demo-components/SessionKeyDemo"
import WalletCallsDemo from "./demo-components/WalletCallsDemo"
import WalletFunctionalityDemo from "./demo-components/WalletFunctionalityDemo"

function App() {
    const { user } = useHappyChain()

    return (
        <main className='flex min-h-dvh w-full flex-col items-center gap-4 bg-[url("/francesco-ungaro-Wn8JoB8FP70-unsplash.jpg")] bg-cover p-4'>
            <h1 className="p-16 text-4xl font-bold text-white">HappyChain + TS + React + Viem</h1>

            <div className="flex flex-col md:grid grid-cols-2 gap-4 w-full md:max-w-screen-lg">
                <ConnectionDemo />

                <div className="overflow-auto backdrop-blur-sm bg-gray-200/35 col-span-2 p-4 flex flex-col gap-4 rounded-lg">
                    <p className="text-lg font-bold">User Details</p>
                    <pre>{JSON.stringify(user, null, 2)}</pre>
                </div>

                <WalletCallsDemo />
                <ChainSwitchingDemo />
                <WalletFunctionalityDemo />
                <SessionKeyDemo />
            </div>
        </main>
    )
}

export default App
