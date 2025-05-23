import type { Game } from "../GamesPage"

export default function GameCard({ game, onManage }: { game: Game; onManage: (g: Game) => void }) {
    return (
        <div className="game-card">
            <div className="game-card-title">{game.name}</div>
            {game.description && <div className="game-card-desc">{game.description}</div>}
            <button className="game-card-manage-btn" type="button" onClick={() => onManage(game)}>
                Manage
            </button>
        </div>
    )
}
