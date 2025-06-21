import { useHappyWallet } from "@happy.tech/react"
import { WalletType } from "@happy.tech/wallet-common"
import { ChainSwitchingDemo } from "./demo-components/ChainSwitchingDemo"
import { ConnectionDemo } from "./demo-components/ConnectionDemo"
import { ContractInteractionDemo } from "./demo-components/ContractInteractionDemo"
import { RPCCallsDemo } from "./demo-components/RPCCallsDemo"
import { SessionKeyDemo } from "./demo-components/SessionKeyDemo"
import { WalletActionsDemo } from "./demo-components/WalletActionsDemo"

function App() {
    const { user } = useHappyWallet()
    return (
        <main className='flex min-h-dvh w-full flex-col items-center p-4 pb-8 gap-4 bg-[url("/francesco-ungaro-Wn8JoB8FP70-unsplash.jpg")] bg-cover'>
            <h1 className="sm:p-8 text-4xl font-bold text-white">HappyChain + TS + React + Viem</h1>

            <div className="flex flex-col md:grid grid-cols-2 gap-4 w-full md:max-w-screen-lg">
                <ConnectionDemo />

                <details className="overflow-auto backdrop-blur-sm bg-gray-200/35 col-span-2 p-4 rounded-lg [&[open]>summary]:mb-4">
                    <summary className="text-lg font-bold">User Details</summary>
                    <pre className="break-all whitespace-pre-wrap bg-gray-200/25 p-2 rounded-lg">
                        {JSON.stringify(user, null, 2)}
                    </pre>
                </details>

                <RPCCallsDemo />
                {!(user?.type === WalletType.Injected && import.meta.env.PROD) && <ChainSwitchingDemo />}
                <WalletActionsDemo />
                <SessionKeyDemo />
                <ContractInteractionDemo />
            </div>
        </main>
    )
}

export default App
