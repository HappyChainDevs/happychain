import { useHappyWallet } from "@happy.tech/react"
import ConnectionDemo from "./components/ConnectionDemo"

function App() {
    useHappyWallet()

    return (
        <main className='flex min-h-dvh w-full flex-col items-center gap-4 bg-[url("/cat-frolicking.jpeg")] bg-center bg-no-repeat bg-contain p-4'>
            <h1 className="p-16 text-4xl font-bold text-white">Leaderboard</h1>

            <div className="flex flex-col justify-center items-center w-full">
                <ConnectionDemo />
            </div>
        </main>
    )
}

export default App
