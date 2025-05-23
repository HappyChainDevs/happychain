type GameCreateBoxProps = {
    newGameName: string
    setNewGameName: (s: string) => void
    newGameDescription: string
    setNewGameDescription: (s: string) => void
    loading: boolean
    handleCreateGame: () => void
}

export default function GameCreateBox({
    newGameName,
    setNewGameName,
    newGameDescription,
    setNewGameDescription,
    loading,
    handleCreateGame,
}: GameCreateBoxProps) {
    return (
        <div
            className="games-create-box"
            style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch" }}
        >
            <input
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                placeholder="Game name"
                disabled={loading}
            />
            <textarea
                value={newGameDescription}
                onChange={(e) => setNewGameDescription(e.target.value)}
                placeholder="Description (optional)"
                disabled={loading}
                rows={2}
                style={{ resize: "vertical", width: "100%" }}
            />
            <button type="button" onClick={handleCreateGame} disabled={loading || !newGameName}>
                Create Game
            </button>
        </div>
    )
}
