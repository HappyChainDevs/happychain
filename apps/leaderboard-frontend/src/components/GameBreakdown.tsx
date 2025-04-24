import { useState } from "react"
import { PLAYER_DATA } from "./LeaderBoard"

const GAME_BREAKDOWNS = [
    { game: "W", players: ["Faultproofben", "ProofOfJake", "pet3rpan", "saucepoint"], topScore: 1450 },
    { game: "G", players: ["Yonada", "yanik", "Classicj", "oVermillion"], topScore: 1250 },
    { game: "S", players: ["Faultproofben", "ProofOfJake"], topScore: 750 },
    { game: "T", players: ["Faultproofben", "Yonada", "yanik"], topScore: 600 },
]

export default function GameBreakdown() {
    const [selected, setSelected] = useState(0)
    return (
        <div className="flex flex-col items-center w-full">
            <h1 className="text-3xl font-bold my-8">Game Breakdowns</h1>
            <div className="flex mb-4">
                {GAME_BREAKDOWNS.map((g, i) => (
                    <button
                        type="button"
                        key={g.game}
                        className={`px-4 py-2 border rounded-lg mx-1 ${selected === i ? "bg-gray-300 font-bold" : "bg-gray-100"}`}
                        onClick={() => setSelected(i)}
                    >
                        {g.game}
                    </button>
                ))}
            </div>
            <div className="w-full max-w-md bg-white border rounded-lg shadow p-4">
                <h2 className="text-xl font-semibold mb-2">Game: {GAME_BREAKDOWNS[selected].game}</h2>
                <table className="w-full border table-auto text-sm bg-gray-50 rounded-lg overflow-hidden">
                    <thead>
                        <tr className="bg-gray-200 text-gray-700">
                            <th className="border p-2">Username</th>
                            <th className="border p-2">Guild</th>
                            <th className="border p-2">Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {GAME_BREAKDOWNS[selected].players.map((username, _idx) => {
                            const player = PLAYER_DATA.find((p) => p.name === username)
                            return (
                                <tr
                                    key={username}
                                    className="even:bg-white odd:bg-gray-100 hover:bg-blue-100 transition-colors"
                                >
                                    <td className="border p-2 font-medium">{username}</td>
                                    <td className="border p-2">{player ? player.guild : "-"}</td>
                                    <td className="border p-2 font-semibold text-right">
                                        {player ? player.score : "-"}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
