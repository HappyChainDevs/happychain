import { useHappyWallet } from "@happy.tech/react"
import ConnectionDemo from "./components/ConnectionDemo"

function App() {
    // const { user } = useHappyWallet()
    useHappyWallet()

    return (
        <main className='flex min-h-dvh w-full flex-col items-center gap-4 bg-[url("/francesco-ungaro-Wn8JoB8FP70-unsplash.jpg")] bg-cover p-4'>
            <h1 className="p-16 text-4xl font-bold text-white">HappyChain + TS + React + Viem</h1>

            <div className="flex flex-col justify-center items-center w-full">
                <ConnectionDemo />
            </div>
        </main>
    )
}

export default App
