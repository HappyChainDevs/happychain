import { useHappyWallet } from "@happy.tech/react"
import { useEffect, useState } from "react"
import GameCard from "./games/GameCard"
import GameCreateBox from "./games/GameCreateBox"
import GameDetails from "./games/GameDetails"

export type Game = {
    id: string
    name: string
    description?: string
    creator_id: string
}

const GamesPage = () => {
    const { user } = useHappyWallet()
    const [games, setGames] = useState<Game[]>([])
    const [showDetails, setShowDetails] = useState<Game | null>(null)
    const [newGameName, setNewGameName] = useState("")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Fetch games for this user (by creator_id)
    useEffect(() => {
        if (!user) {
            setGames([])
            return
        }
        setLoading(true)
        fetch(`/api/games?creator_id=${user.address}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.ok && Array.isArray(data.data)) {
                    setGames(data.data)
                } else {
                    setGames([])
                }
            })
            .finally(() => setLoading(false))
    }, [user])

    // Create new game
    const handleCreateGame = async () => {
        setMessage(null)
        setError(null)
        if (!newGameName) return
        setLoading(true)
        try {
            const res = await fetch("/api/games", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newGameName }),
            })
            const data = await res.json()
            if (res.ok && data.ok) {
                setGames((g) => [...g, data.data])
                setMessage("Game created!")
                setNewGameName("")
            } else {
                setError(data.error || "Failed to create game.")
            }
        } catch (e) {
            setError("Failed to create game.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="games-page">
            <h2>Games</h2>
            <GameCreateBox
                newGameName={newGameName}
                setNewGameName={setNewGameName}
                loading={loading}
                handleCreateGame={handleCreateGame}
            />
            {message && <div className="message">{message}</div>}
            {error && <div className="error">{error}</div>}
            <div className="games-list">
                {games.map((game) => (
                    <GameCard key={game.id} game={game} onManage={setShowDetails} />
                ))}
            </div>
            {showDetails && <GameDetails game={showDetails} onClose={() => setShowDetails(null)} />}
        </div>
    )
}

export default GamesPage
