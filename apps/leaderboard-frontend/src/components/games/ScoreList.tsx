import type { Score } from "./GameDetails"

export default function ScoreList({ scores }: { scores: Score[] }) {
    if (!scores.length) return <div>No scores yet.</div>
    return (
        <div className="score-list">
            <h4>Scores</h4>
            <ul>
                {scores.map((score) => (
                    <li key={score.id}>
                        <strong>{score.username}</strong>: {score.value}
                    </li>
                ))}
            </ul>
        </div>
    )
}
