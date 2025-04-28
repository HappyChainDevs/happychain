import type { Kysely } from "kysely"
import type {
    Database,
    GameGuildLeaderboardEntry,
    GameLeaderboardEntry,
    GameTableId,
    GlobalLeaderboardEntry,
    GuildLeaderboardEntry,
} from "../db/types"

export class LeaderBoardRepository {
    constructor(private db: Kysely<Database>) {}

    // Global leaderboard: top users by total score across all games
    async getGlobalLeaderboard(limit = 50): Promise<GlobalLeaderboardEntry[]> {
        return await this.db
            .selectFrom("users")
            .innerJoin("user_game_scores", "users.id", "user_game_scores.user_id")
            .select([
                "users.id as user_id",
                "users.username",
                "users.primary_wallet",
                this.db.fn.sum<number>("user_game_scores.score").as("total_score"),
            ])
            .groupBy(["users.id", "users.username", "users.primary_wallet"])
            .orderBy("total_score", "desc")
            .limit(limit)
            .execute()
    }

    // Guild leaderboard: top guilds by total score of all members
    async getGuildLeaderboard(limit = 50): Promise<GuildLeaderboardEntry[]> {
        // Get leaderboard entries (without member_count)
        const leaderboardRows = await this.db
            .selectFrom("guilds")
            .innerJoin("guild_members", "guilds.id", "guild_members.guild_id")
            .innerJoin("user_game_scores", "guild_members.user_id", "user_game_scores.user_id")
            .select([
                "guilds.id as guild_id",
                "guilds.name as guild_name",
                "guilds.icon_url",
                this.db.fn.sum<number>("user_game_scores.score").as("total_score"),
            ])
            .groupBy(["guilds.id", "guilds.name", "guilds.icon_url"])
            .orderBy("total_score", "desc")
            .limit(limit)
            .execute()

        // Get member counts for all guilds in the leaderboard
        const guildIds = leaderboardRows.map((row) => row.guild_id)
        let memberCounts: Record<number, number> = {}
        if (guildIds.length > 0) {
            const memberCountRows = await this.db
                .selectFrom("guild_members")
                .select(["guild_id", this.db.fn.count<number>("user_id").as("member_count")])
                .where("guild_id", "in", guildIds)
                .groupBy(["guild_id"])
                .execute()
            memberCounts = Object.fromEntries(memberCountRows.map((row) => [row.guild_id, row.member_count]))
        }

        return leaderboardRows.map((row) => ({
            ...row,
            member_count: memberCounts[row.guild_id] ?? 0,
        }))
    }

    // Game-specific leaderboard: top users by score in a game
    async getGameLeaderboard(gameId: GameTableId, limit = 50): Promise<GameLeaderboardEntry[]> {
        return await this.db
            .selectFrom("user_game_scores")
            .innerJoin("users", "users.id", "user_game_scores.user_id")
            .where("user_game_scores.game_id", "=", gameId)
            .select([
                "user_game_scores.game_id",
                "users.id as user_id",
                "users.username",
                "users.primary_wallet",
                "user_game_scores.score",
            ])
            .orderBy("user_game_scores.score", "desc")
            .limit(limit)
            .execute()
    }

    // Game-specific guild leaderboard: top guilds by total score of members in a game
    async getGameGuildLeaderboard(gameId: GameTableId, limit = 50): Promise<GameGuildLeaderboardEntry[]> {
        return await this.db
            .selectFrom("guilds")
            .innerJoin("guild_members", "guilds.id", "guild_members.guild_id")
            .innerJoin("user_game_scores", "guild_members.user_id", "user_game_scores.user_id")
            .where("user_game_scores.game_id", "=", gameId)
            .select([
                "user_game_scores.game_id",
                "guilds.id as guild_id",
                "guilds.name as guild_name",
                "guilds.icon_url",
                this.db.fn.sum<number>("user_game_scores.score").as("total_score"),
                this.db.fn.count<number>("guild_members.id").as("member_count"),
            ])
            .groupBy(["user_game_scores.game_id", "guilds.id", "guilds.name", "guilds.icon_url"])
            .orderBy("total_score", "desc")
            .limit(limit)
            .execute()
    }
}
