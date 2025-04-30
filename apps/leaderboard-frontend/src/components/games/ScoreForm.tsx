import { useState } from "react"
import type { Game } from "../GamesPage"
import type { Score } from "./GameDetails"

export default function ScoreForm({ game, onScoreSubmit }: { game: Game; onScoreSubmit: (score: Score) => void }) {
    const [username, setUsername] = useState("")
    const [value, setValue] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        if (!username || !value) return
        setLoading(true)
        try {
            const res = await fetch(`/api/games/${game.id}/scores`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, value: Number(value) }),
            })
            const data = await res.json()
            if (res.ok && data.ok) {
                onScoreSubmit(data.data)
                setUsername("")
                setValue("")
            } else {
                setError(data.error || "Failed to submit score.")
            }
        } catch (e) {
            setError("Failed to submit score.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form className="score-form" onSubmit={handleSubmit}>
            <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                disabled={loading}
            />
            <input
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Score"
                disabled={loading}
                type="number"
                min="0"
            />
            <button type="submit" disabled={loading || !username || !value}>
                Submit Score
            </button>
            {error && <div className="error">{error}</div>}
        </form>
    )
}
