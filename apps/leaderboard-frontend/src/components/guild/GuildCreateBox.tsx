export default function GuildCreateBox({
    newGuildName,
    setNewGuildName,
    newGuildDesc,
    setNewGuildDesc,
    loading,
    handleCreateGuild,
}: {
    newGuildName: string;
    setNewGuildName: (s: string) => void;
    newGuildDesc: string;
    setNewGuildDesc: (s: string) => void;
    loading: boolean;
    handleCreateGuild: () => void;
}) {
    return (
        <div className="guilds-create-box">
            <input
                value={newGuildName}
                onChange={(e) => setNewGuildName(e.target.value)}
                placeholder="Guild name"
                disabled={loading}
            />
            <input
                value={newGuildDesc}
                onChange={(e) => setNewGuildDesc(e.target.value)}
                placeholder="Description (optional)"
                disabled={loading}
            />
            <button type="button" onClick={handleCreateGuild} disabled={loading || !newGuildName}>
                Create Guild
            </button>
        </div>
    );
}
