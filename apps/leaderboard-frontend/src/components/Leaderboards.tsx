import type React from "react"
import { useEffect, useState } from "react"
import "../index.css"
import "./leaderboards.css"

export interface GlobalLeaderboardEntry {
    user_id: string
    username: string
    primary_wallet: string
    total_score: number
}

export interface GuildLeaderboardEntry {
    guild_id: string
    guild_name: string
    icon_url: string | null
    total_score: number
    member_count: number
}

const fetchLeaderboard = async <T,>(endpoint: string, limit = 10): Promise<T[]> => {
    const res = await fetch(`/api/leaderboards/${endpoint}?limit=${limit}`)
    if (!res.ok) throw new Error("Failed to fetch leaderboard")
    const json = await res.json()
    if (!json.ok) throw new Error(json.error || "Unknown error")
    return json.data as T[]
}

const LeaderboardTable: React.FC<{
    title: string
    entries: GlobalLeaderboardEntry[] | GuildLeaderboardEntry[]
    type: "global" | "guilds"
}> = ({ title, entries, type }) => (
    <div className="leaderboard-card">
        <h2 className="leaderboard-title">{title}</h2>
        <table className="leaderboard-table">
            <thead>
                <tr>
                    <th>Rank</th>
                    {type === "global" ? <th>Player</th> : <th>Guild</th>}
                    <th>Score</th>
                    {type === "guilds" && <th>Members</th>}
                </tr>
            </thead>
            <tbody>
                {entries.length === 0 ? (
                    <tr>
                        <td colSpan={type === "guilds" ? 4 : 3}>No data</td>
                    </tr>
                ) : (
                    entries.map((entry, idx) => (
                        <tr
                            key={
                                type === "global"
                                    ? (entry as GlobalLeaderboardEntry).user_id
                                    : (entry as GuildLeaderboardEntry).guild_id
                            }
                        >
                            <td>{idx + 1}</td>
                            {type === "global" ? (
                                <td>{(entry as GlobalLeaderboardEntry).username}</td>
                            ) : (
                                <td>
                                    {(entry as GuildLeaderboardEntry).icon_url && (
                                        <img
                                            src={(entry as GuildLeaderboardEntry).icon_url!}
                                            alt=""
                                            style={{
                                                width: 24,
                                                height: 24,
                                                marginRight: 8,
                                                verticalAlign: "middle",
                                                borderRadius: "50%",
                                            }}
                                        />
                                    )}
                                    {(entry as GuildLeaderboardEntry).guild_name}
                                </td>
                            )}
                            <td>
                                {type === "global"
                                    ? (entry as GlobalLeaderboardEntry).total_score
                                    : (entry as GuildLeaderboardEntry).total_score}
                            </td>
                            {type === "guilds" && <td>{(entry as GuildLeaderboardEntry).member_count}</td>}
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    </div>
)

const Leaderboards: React.FC = () => {
    const [global, setGlobal] = useState<GlobalLeaderboardEntry[]>([])
    const [guilds, setGuilds] = useState<GuildLeaderboardEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setLoading(true)
        setError(null)
        Promise.all([
            fetchLeaderboard<GlobalLeaderboardEntry>("global", 10),
            fetchLeaderboard<GuildLeaderboardEntry>("guilds", 10),
        ])
            .then(([globalData, guildData]) => {
                setGlobal(globalData)
                setGuilds(guildData)
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div className="leaderboards-loading">Loading leaderboards...</div>
    if (error) return <div className="leaderboards-error">{error}</div>

    return (
        <div className="leaderboards-container">
            <LeaderboardTable title="Top Players" entries={global} type="global" />
            <LeaderboardTable title="Top Guilds" entries={guilds} type="guilds" />
        </div>
    )
}

export default Leaderboards
