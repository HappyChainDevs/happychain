export default function GameCreateBox({
    newGameName,
    setNewGameName,
    loading,
    handleCreateGame,
}: {
    newGameName: string
    setNewGameName: (s: string) => void
    loading: boolean
    handleCreateGame: () => void
}) {
    return (
        <div className="games-create-box">
            <input
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                placeholder="Game name"
                disabled={loading}
            />
            <button type="button" onClick={handleCreateGame} disabled={loading || !newGameName}>
                Create Game
            </button>
        </div>
    )
}
