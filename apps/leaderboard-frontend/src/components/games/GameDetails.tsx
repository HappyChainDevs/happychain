import { useEffect, useState } from "react"
import type { Game } from "../GamesPage"
import ScoreForm from "./ScoreForm"
import ScoreList from "./ScoreList"

export type Score = {
    id: string
    username: string
    value: number
    game_id: string
}

export default function GameDetails({ game, onClose }: { game: Game; onClose: () => void }) {
    const [scores, setScores] = useState<Score[]>([])
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/games/${game.id}/scores`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.ok && Array.isArray(data.data)) {
                    setScores(data.data)
                } else {
                    setScores([])
                }
            })
            .finally(() => setLoading(false))
    }, [game.id])

    const handleScoreSubmit = (score: Score) => {
        setScores((prev) => [...prev, score])
        setMessage("Score submitted!")
    }

    return (
        <div className="game-details">
            <button type="button" className="close-btn" onClick={onClose}>
                &times;
            </button>
            <h3>{game.name}</h3>
            <div>{game.description || "No description"}</div>
            <ScoreForm game={game} onScoreSubmit={handleScoreSubmit} />
            <ScoreList scores={scores} />
            {message && <div className="message">{message}</div>}
            {error && <div className="error">{error}</div>}
        </div>
    )
}
