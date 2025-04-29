import { useEffect, useState } from "react"
import type { Guild, GuildMember } from "../GuildsPage"
import type { UserProfile } from "../ProfilePage"

export default function GuildDetails({
    guild,
    onClose,
    profile,
}: { guild: Guild; onClose: () => void; profile: UserProfile | null }) {
    const [members, setMembers] = useState<GuildMember[]>([])
    const [loading, setLoading] = useState(false)
    const [addUser, setAddUser] = useState("")
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/guilds/${guild.id}/members`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.ok && Array.isArray(data.data)) {
                    setMembers(data.data)
                } else {
                    setMembers([])
                }
            })
            .finally(() => setLoading(false))
    }, [guild.id])

    // Add member logic: resolve username to user_id, then POST
    const handleAddMember = async () => {
        setMessage(null)
        setError(null)
        if (!addUser) return
        setLoading(true)
        try {
            // Resolve username to user_id
            const userId = await getUserIdByUsername(addUser)
            if (!userId) {
                setError("User not found")
                setLoading(false)
                return
            }
            // POST to /guilds/:id/members
            const res = await fetch(`/api/guilds/${guild.id}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId, is_admin: false }),
            })
            const data = await res.json()
            if (res.ok && data.ok) {
                setMembers((m) => [...m, data.data])
                setMessage("Member added!")
                setAddUser("")
            } else {
                let errMsg = "Failed to add member."
                if (typeof data.error === "string") {
                    errMsg = data.error
                } else if (data.error && typeof data.error === "object") {
                    if (data.error.issues) {
                        // biome-ignore lint/suspicious/noExplicitAny: error shape from backend
                        errMsg =
                            data.error.issues.map((issue: any) => issue.message).join("; ") || data.error.name || errMsg
                    } else if (data.error.message) {
                        errMsg = data.error.message
                    } else if (data.error.name) {
                        errMsg = data.error.name
                    } else {
                        errMsg = JSON.stringify(data.error)
                    }
                }
                setError(errMsg)
            }
        } catch (e) {
            setError("Network error")
        } finally {
            setLoading(false)
        }
    }

    // Utility to resolve username → user_id
    async function getUserIdByUsername(username: string): Promise<number | null> {
        const res = await fetch(`/api/users?username=${encodeURIComponent(username)}`)
        if (!res.ok) return null
        const data = await res.json()
        if (data.ok && Array.isArray(data.data) && data.data.length > 0) {
            return data.data[0].id
        }
        return null
    }

    return (
        <div className="guild-details-modal">
            <button className="guild-details-close" type="button" onClick={onClose}>
                ×
            </button>
            <div className="guild-details-title">{guild.name}</div>
            <div className="guild-details-desc">{guild.description}</div>
            <div className="guild-details-members">
                <b>Members:</b>
                {loading ? (
                    <div>Loading...</div>
                ) : (
                    <ul>
                        {members.map((mem) => (
                            <li key={mem.id}>
                                {mem.username} ({mem.primary_wallet})
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="guild-details-add">
                <input
                    value={addUser}
                    onChange={(e) => setAddUser(e.target.value)}
                    placeholder="Username to add"
                    disabled={loading}
                />
                <button type="button" onClick={handleAddMember} disabled={loading || !addUser}>
                    Add Member
                </button>
            </div>
            {message && <div style={{ color: "green", marginTop: 10 }}>{message}</div>}
            {error && <div style={{ color: "#c00", marginTop: 10 }}>{error}</div>}
        </div>
    )
}
