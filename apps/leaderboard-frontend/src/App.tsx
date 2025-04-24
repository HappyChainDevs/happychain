import GameBreakdown from "./components/GameBreakdown"
import LeaderBoard from "./components/LeaderBoard"

function App() {
    return (
        <div className="min-h-dvh w-full flex flex-col bg-[url('/cat-frolicking.jpeg')] bg-center bg-no-repeat bg-contain">
            <main className="flex-1 flex flex-col items-center justify-center">
                <LeaderBoard />
                <GameBreakdown />
            </main>
        </div>
    )
}

export default App
