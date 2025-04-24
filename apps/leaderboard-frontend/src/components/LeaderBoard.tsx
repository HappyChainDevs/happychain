import { useState } from "react"

export const PLAYER_DATA = [
    { name: "Faultproofben", guild: "WASD", played: ["W", "G", "S", "T"], score: 1450 },
    { name: "Yonada", guild: "-", played: ["G", "S", "T"], score: 1250 },
    { name: "ProofOfJake", guild: "[WE]", played: ["W", "S", "T"], score: 750 },
    { name: "yanik", guild: "Orden", played: ["G", "W", "T"], score: 600 },
    { name: "Classicj", guild: "Orden", played: ["G", "T"], score: 550 },
    { name: "pet3rpan", guild: "[WE]", played: ["W", "G"], score: 320 },
    { name: "oVermillion", guild: "WASD", played: ["G"], score: 200 },
    { name: "saucepoint", guild: "-", played: ["W"], score: 100 },
]

const GUILD_DATA = [
    { guild: "WASD", played: ["W", "G", "S", "T"], score: 1450 },
    { guild: "[WE]", played: ["G", "S", "T"], score: 1250 },
    { guild: "Orden", played: ["G", "W", "T"], score: 750 },
]

export default function LeaderBoard() {
    const [tab, setTab] = useState<"main" | "guilds">("main")

    return (
        <div className="flex flex-col items-center w-full">
            <h1 className="text-4xl font-bold my-10">Happy Swarm Leaderboard</h1>
            <div className="flex mb-4">
                <button
                    type="button"
                    className={`px-6 py-2 rounded-t-lg border bg-gray-200 ${tab === "main" ? "font-bold" : ""}`}
                    onClick={() => setTab("main")}
                >
                    Main
                </button>
                <button
                    type="button"
                    className={`px-6 py-2 rounded-t-lg border bg-gray-200 ml-2 ${tab === "guilds" ? "font-bold" : ""}`}
                    onClick={() => setTab("guilds")}
                >
                    Guilds
                </button>
            </div>
            <div className="w-full max-w-2xl bg-white border rounded-lg shadow p-4">
                {tab === "main" ? (
                    <table className="w-full border table-auto text-sm bg-gray-50 rounded-lg overflow-hidden">
                        <thead>
                            <tr className="bg-gray-200 text-gray-700">
                                <th className="border p-2">Username</th>
                                <th className="border p-2">Guild Name</th>
                                <th className="border p-2">Games</th>
                                <th className="border p-2">Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {PLAYER_DATA.map((p, i) => (
                                <tr
                                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                                    key={i}
                                    className="even:bg-white odd:bg-gray-100 hover:bg-blue-100 transition-colors"
                                >
                                    <td className="border p-2 font-medium">{p.name}</td>
                                    <td className="border p-2">{p.guild}</td>
                                    <td className="border p-2">{p.played.join(", ")}</td>
                                    <td className="border p-2 font-semibold text-right">{p.score}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full border table-auto text-sm bg-gray-50 rounded-lg overflow-hidden">
                        <thead>
                            <tr className="bg-gray-200 text-gray-700">
                                <th className="border p-2">Guild Name</th>
                                <th className="border p-2">Games</th>
                                <th className="border p-2">Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {GUILD_DATA.map((g, i) => (
                                <tr
                                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                                    key={i}
                                    className="even:bg-white odd:bg-gray-100 hover:bg-blue-100 transition-colors"
                                >
                                    <td className="border p-2 font-medium">{g.guild}</td>
                                    <td className="border p-2">{g.played.join(", ")}</td>
                                    <td className="border p-2 font-semibold text-right">{g.score}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
