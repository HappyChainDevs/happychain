import { useHappyWallet } from "@happy.tech/react"
import { useEffect, useState } from "react"
import type { UserProfile } from "./ProfilePage"
import GuildCard from "./guild/GuildCard"
import GuildCreateBox from "./guild/GuildCreateBox"
import GuildDetails from "./guild/GuildDetails"

// --- Types ---
export type Guild = {
    id: string
    name: string
    description?: string
    creator_id: string
}

export type GuildMember = {
    id: string
    username: string
    primary_wallet: string
}

// --- Main Page ---
const GuildsPage = () => {
    const { user } = useHappyWallet()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [guilds, setGuilds] = useState<Guild[]>([])
    const [showDetails, setShowDetails] = useState<Guild | null>(null)
    const [newGuildName, setNewGuildName] = useState("")

    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Fetch profile on mount or when wallet connects
    useEffect(() => {
        if (!user) {
            setProfile(null)
            setGuilds([])
            return
        }
        setLoading(true)
        fetch(`/api/users?wallet_address=${user.address}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.ok && Array.isArray(data.data) && data.data.length > 0) {
                    setProfile(data.data[0])
                } else {
                    setProfile(null)
                }
            })
            .finally(() => setLoading(false))
    }, [user])

    // Fetch guilds for this user (by creator_id)
    useEffect(() => {
        if (!profile?.id) return
        setLoading(true)
        fetch(`/api/guilds?creator_id=${Number(profile.id)}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.ok && Array.isArray(data.data)) {
                    setGuilds(data.data)
                } else {
                    setGuilds([])
                }
            })
            .finally(() => setLoading(false))
    }, [profile])

    const handleCreateGuild = async () => {
        setMessage(null)
        setError(null)
        if (!newGuildName || !profile?.id) return
        setLoading(true)
        try {
            const res = await fetch("/api/guilds", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newGuildName,
                    creator_id: Number(profile.id),
                }),
            })
            const data = await res.json()
            if (res.ok && data.ok) {
                setGuilds((guilds) => [data.data, ...guilds])
                setMessage("Guild created!")
                setNewGuildName("")
            } else {
                let errMsg = "Failed to create guild."
                if (typeof data.error === "string") {
                    errMsg = data.error
                } else if (data.error && typeof data.error === "object") {
                    if (data.error.issues) {
                        errMsg =
                            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
            setError("Network error: " + e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="guilds-page">
            <h2>Guilds</h2>
            <GuildCreateBox
                newGuildName={newGuildName}
                setNewGuildName={setNewGuildName}
                loading={loading}
                handleCreateGuild={handleCreateGuild}
            />
            {message && <div style={{ color: "green", marginTop: 10 }}>{message}</div>}
            {error && <div style={{ color: "#c00", marginTop: 10 }}>{error}</div>}
            <div className="guilds-list">
                {guilds.length === 0 ? (
                    <div>No guilds found.</div>
                ) : (
                    guilds.map((guild) => <GuildCard key={guild.id} guild={guild} onManage={setShowDetails} />)
                )}
            </div>
            {showDetails && <GuildDetails guild={showDetails} onClose={() => setShowDetails(null)} profile={profile} />}
        </div>
    )
}

export default GuildsPage
