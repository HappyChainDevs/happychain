import { useHappyWallet } from "@happy.tech/react"
import { useEffect, useState } from "react"
import GameCard from "./games/GameCard"
import GameCreateBox from "./games/GameCreateBox"
import GameDetails from "./games/GameDetails"
import MyScoresCard from "./games/MyScoresCard"

export type Game = {
    id: number
    name: string
    description?: string
    admin_id: number
}

const GamesPage = () => {
    const { user } = useHappyWallet()
    const [games, setGames] = useState<Game[]>([])
    const [showDetails, setShowDetails] = useState<Game | null>(null)
    const [newGameName, setNewGameName] = useState("")
    const [newGameDescription, setNewGameDescription] = useState("")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Fetch games for this user (by admin wallet)
    useEffect(() => {
        if (!user) {
            setGames([])
            return
        }
        setLoading(true)
        fetch(`/api/games/admin/${user.address}`)
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
                body: JSON.stringify({
                    name: newGameName,
                    description: newGameDescription,
                    admin_wallet: user?.address,
                }),
            })
            const data = await res.json()
            if (res.ok && data.ok) {
                setGames((g) => [...g, data.data])
                setMessage("Game created!")
                setNewGameName("")
                setNewGameDescription("")
            } else {
                setError(data?.error || JSON.stringify(data))
            }
        } catch (e) {
            setError("Failed to create game: " + e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-evenly",
                alignItems: "flex-start",
                gap: 3,
                height: "100vh",
                width: "100vw",
            }}
        >
            {/* LEFT: GAMES COLUMN */}
            <div
                className="games-page"
                style={{
                    width: 400,
                    background: "#fff",
                    borderRadius: 12,
                    boxShadow: "0 2px 8px #0001",
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                }}
            >
                <h2>Games</h2>
                <GameCreateBox
                    newGameName={newGameName}
                    setNewGameName={setNewGameName}
                    newGameDescription={newGameDescription}
                    setNewGameDescription={setNewGameDescription}
                    loading={loading}
                    handleCreateGame={handleCreateGame}
                />
                {message && <div className="message">{message}</div>}
                {error && <div className="error">{error}</div>}
                {loading ? (
                    <div className="loading-spinner">Loading games...</div>
                ) : (
                    <div className="games-list">
                        {games.length === 0 ? (
                            <div className="empty-list">No games found.</div>
                        ) : (
                            games.map((game) => <GameCard key={game.id} game={game} onManage={setShowDetails} />)
                        )}
                    </div>
                )}
                {showDetails && <GameDetails game={showDetails} onClose={() => setShowDetails(null)} />}
            </div>
            {/* RIGHT: MY SCORES COLUMN */}
            {user && (
                <div
                    style={{
                        width: 400,
                        background: "#fff",
                        borderRadius: 12,
                        boxShadow: "0 2px 8px #0001",
                        padding: 24,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "stretch",
                    }}
                >
                    <MyScoresCard userWallet={user.address} games={games} />
                </div>
            )}
        </div>
    )
}

export default GamesPage
