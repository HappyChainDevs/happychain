import type { HappyUser } from "@happy.tech/core"
import { useHappyWallet } from "@happy.tech/react"
import { useEffect, useState } from "react"

export type UserProfile = {
    id: string // or number, depending on backend
    primary_wallet: string
    username: string
    // add other fields from backend if needed
}

function ProfileWelcomeBox({ profile }: { profile: UserProfile }) {
    return (
        <div className="profile-welcome-container">
            <div className="profile-welcome-title">Welcome, {profile.username}</div>
            <div className="profile-welcome-fields">
                <b>ID:</b> {profile.id}
                <br />
                <b>Wallet:</b> {profile.primary_wallet}
                <br />
                <b>Username:</b> {profile.username}
                <br />
                {/* Add more fields here if needed */}
            </div>
        </div>
    )
}

type ProfileFormBoxProps = {
    user: HappyUser | undefined
    profile: UserProfile | null
    username: string
    loading: boolean
    message: string | null
    error: string | null
    setUsername: (s: string) => void
    onCreate: () => Promise<void>
    onUpdate: () => Promise<void>
}

function ProfileFormBox({
    user,
    profile,
    username,
    loading,
    message,
    error,
    setUsername,
    onCreate,
    onUpdate,
}: ProfileFormBoxProps) {
    return (
        <div className="profile-form-container">
            {!user ? (
                <>
                    <h2 className="profile-form-title">Connect your wallet</h2>
                    <div className="profile-form-subtitle">Please connect your wallet to manage your profile.</div>
                </>
            ) : loading ? (
                <div style={{ minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    Loading...
                </div>
            ) : profile ? (
                <>
                    <h2 className="profile-form-title">Edit Profile</h2>
                    <div className="profile-form-subtitle">Update your username below:</div>
                    <input
                        className="profile-form-input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter username"
                        disabled={loading}
                    />
                    <button
                        className="profile-form-btn"
                        type="button"
                        onClick={onUpdate}
                        disabled={!username || loading || username === profile.username}
                    >
                        {loading ? "Saving..." : "Save"}
                    </button>
                </>
            ) : (
                <>
                    <h2 className="profile-form-title">No profile found</h2>
                    <div className="profile-form-subtitle">Create your profile to get started:</div>
                    <input
                        className="profile-form-input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter username"
                        disabled={loading}
                    />
                    <button
                        className="profile-form-btn"
                        type="button"
                        onClick={onCreate}
                        disabled={!username || loading}
                    >
                        {loading ? "Creating..." : "Create"}
                    </button>
                </>
            )}
            {message && <div style={{ color: "green", marginTop: 14 }}>{message}</div>}
            {error && <div style={{ color: "#c00", marginTop: 14 }}>{error}</div>}
        </div>
    )
}

const ProfilePage = () => {
    const { user } = useHappyWallet()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [username, setUsername] = useState("")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Fetch user profile when wallet connects
    useEffect(() => {
        if (user) {
            setLoading(true)
            fetch(`/api/users?wallet_address=${user.address}`)
                .then((res) => (res.ok ? res.json() : null))
                .then((data) => {
                    if (data?.ok && Array.isArray(data.data) && data.data.length > 0) {
                        setProfile(data.data[0] as UserProfile)
                        setUsername((data.data[0] as UserProfile).username)
                    } else {
                        setProfile(null)
                    }
                })
                .finally(() => setLoading(false))
        } else {
            setProfile(null)
            setUsername("")
        }
    }, [user])

    // Create user profile
    const handleCreate = async () => {
        if (loading) return
        setLoading(true)
        setMessage(null)
        setError(null)
        try {
            console.log("Submitting profile create request...")
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ primary_wallet: user?.address, username }),
            })
            const data = await res.json()
            console.log("Profile create response:", data)
            if (res.ok && data.ok) {
                // Ensure id is set from backend response if present
                if (data?.ok && data?.data?.id) {
                    setProfile(data.data as UserProfile)
                } else if (Array.isArray(data?.data) && data?.data[0]?.id) {
                    setProfile(data.data[0] as UserProfile)
                } else {
                    setProfile({
                        id: "", // fallback, but should not happen in normal backend
                        primary_wallet: user?.address || "",
                        username,
                    })
                }
                setMessage("Profile created successfully!")
            } else {
                setError(data.error || "Failed to create profile.")
            }
        } catch (err) {
            setError("Network error. Please try again.")
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    // Handlers for form box
    const handleUpdate = async () => {
        if (!profile || loading) return
        setLoading(true)
        setMessage(null)
        setError(null)
        try {
            const res = await fetch(`/api/users/${profile.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }),
            })
            const data = await res.json()
            if (res.ok && data.ok) {
                setProfile(data.data || { ...profile, username })
                setMessage("Profile updated successfully!")
            } else {
                setError(data.error || "Failed to update profile.")
            }
        } catch (err) {
            setError("Network error. Please try again.")
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {/* Welcome box if profile exists */}
            {profile && <ProfileWelcomeBox profile={profile} />}
            {/* Form box (always present, but content varies) */}
            <ProfileFormBox
                user={user}
                profile={profile}
                username={username}
                loading={loading}
                message={message}
                error={error}
                setUsername={setUsername}
                onCreate={handleCreate}
                onUpdate={handleUpdate}
            />
        </>
    )
}

export default ProfilePage
