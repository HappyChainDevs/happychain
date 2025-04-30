import { useEffect, useState } from "react"
import type { Game } from "../GamesPage"

export type MyScore = {
    id: string
    username: string
    user_id: number
    game_id: string
    score: number
    // Optionally: created_at, etc.
}

interface MyScoresCardProps {
    userWallet: string
    games: Game[]
}

export default function MyScoresCard({ userWallet, games }: MyScoresCardProps) {
    const [scores, setScores] = useState<Record<number, MyScore[]>>({})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!userWallet || games.length === 0) {
            setScores({})
            return
        }
        setLoading(true)
        setError(null)
        // Fetch scores for each game for this user
        Promise.all(
            games.map((game) =>
                fetch(`/api/games/${game.id}/scores/user/${userWallet}`)
                    .then((res) => (res.ok ? res.json() : null))
                    .then((data) => ({ gameId: game.id, scores: data?.ok ? data.data : [] })),
            ),
        )
            .then((results) => {
                const scoresMap: Record<number, MyScore[]> = {}
                results.forEach(({ gameId, scores }) => {
                    scoresMap[gameId] = scores || []
                })
                setScores(scoresMap)
            })
            .catch(() => setError("Failed to load your scores."))
            .finally(() => setLoading(false))
    }, [userWallet, games])

    return (
        <div className="my-scores-card">
            <h3 style={{ fontSize: 18, margin: "0 0 12px 0" }}>My Scores</h3>
            {loading ? (
                <div className="loading-spinner">Loading...</div>
            ) : error ? (
                <div className="error">{error}</div>
            ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: "left", padding: "4px 6px", width: 110 }}>Game</th>
                            <th style={{ textAlign: "left", padding: "4px 6px", width: 70 }}>Score(s)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {games.map((game) => (
                            <tr key={game.id}>
                                <td
                                    style={{
                                        padding: "4px 6px",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        maxWidth: 100,
                                    }}
                                >
                                    {game.name}
                                </td>
                                <td style={{ padding: "4px 6px", color: scores[game.id]?.length ? undefined : "#aaa" }}>
                                    {scores[game.id]?.length ? (
                                        scores[game.id].map((s) => s.score).join(", ")
                                    ) : (
                                        <span>—</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}
