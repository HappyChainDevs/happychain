import type { Guild } from "../GuildsPage";

export default function GuildCard({ guild, onManage }: { guild: Guild; onManage: (g: Guild) => void }) {
    return (
        <div className="guild-card">
            <div className="guild-card-title">{guild.name}</div>
            <div className="guild-card-desc">{guild.description || "No description"}</div>
            <button className="guild-card-manage-btn" type="button" onClick={() => onManage(guild)}>
                Manage
            </button>
        </div>
    );
}
