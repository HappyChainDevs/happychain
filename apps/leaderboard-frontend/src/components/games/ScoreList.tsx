import type { Score } from "./GameDetails"

export default function ScoreList({ scores }: { scores: Score[] }) {
    if (!scores.length) return <div>No scores yet.</div>
    return (
        <div className="score-list">
            <h4>Scores</h4>
            <ul>
                {scores.map((score, idx) => (
                    <li key={`${score.id}-${score.username}-${idx}`}>
                        <strong>{score.username}</strong>: {score.score}
                    </li>
                ))}
            </ul>
        </div>
    )
}
