import type { Kysely } from "kysely"
import type { Database, NewUserGameScore, UserGameScore } from "../db/types"

export class UserGameScoreRepository {
    constructor(private db: Kysely<Database>) {}

    async findById(id: number): Promise<UserGameScore | undefined> {
        return await this.db.selectFrom("user_game_scores").where("id", "=", id).selectAll().executeTakeFirst()
    }

    async find(criteria: Partial<UserGameScore>): Promise<UserGameScore[]> {
        let query = this.db.selectFrom("user_game_scores")
        if (criteria.id) query = query.where("id", "=", criteria.id)
        if (criteria.user_id) query = query.where("user_id", "=", criteria.user_id)
        if (criteria.game_id) query = query.where("game_id", "=", criteria.game_id)
        if (criteria.score) query = query.where("score", "=", criteria.score)
        if (criteria.last_updated_at) query = query.where("last_updated_at", "=", criteria.last_updated_at)
        return await query.selectAll().execute()
    }

    async create(score: NewUserGameScore): Promise<UserGameScore> {
        return await this.db.insertInto("user_game_scores").values(score).returningAll().executeTakeFirstOrThrow()
    }

    // Only game admin can update any user's score for their game
    async updateScoreByAdmin(
        gameId: number,
        userId: number,
        score: number,
        actingUserId: number,
    ): Promise<UserGameScore | undefined> {
        // Check if actingUserId is the admin of the game
        const game = await this.db.selectFrom("games").select(["admin_id"]).where("id", "=", gameId).executeTakeFirst()
        if (!game || game.admin_id !== actingUserId) {
            throw new Error("Only the game admin can update scores for this game.")
        }
        // Update or insert the score
        const existing = await this.db
            .selectFrom("user_game_scores")
            .select(["id"])
            .where("game_id", "=", gameId)
            .where("user_id", "=", userId)
            .executeTakeFirst()
        if (existing) {
            await this.db
                .updateTable("user_game_scores")
                .set({ score })
                .where("id", "=", existing.id)
                .executeTakeFirst()
            return await this.findById(existing.id)
        } else {
            return await this.db
                .insertInto("user_game_scores")
                .values({ game_id: gameId, user_id: userId, score, last_updated_at: new Date().toISOString() })
                .returningAll()
                .executeTakeFirstOrThrow()
        }
    }

    // Sorted leaderboard for a game (users)
    async getGameLeaderboard(gameId: number, limit = 100) {
        return await this.db
            .selectFrom("user_game_scores")
            .innerJoin("users", "user_game_scores.user_id", "users.id")
            .select(["users.username", "users.guild_id", "user_game_scores.score"])
            .where("user_game_scores.game_id", "=", gameId)
            .orderBy("user_game_scores.score", "desc")
            .limit(limit)
            .execute()
    }

    // Guild leaderboard for a game (aggregate scores)
    async getGuildLeaderboard(gameId: number, limit = 100) {
        return await this.db
            .selectFrom("user_game_scores")
            .innerJoin("users", "user_game_scores.user_id", "users.id")
            .innerJoin("guilds", "users.guild_id", "guilds.id")
            .select([
                "guilds.name as guild_name",
                this.db.fn.sum("user_game_scores.score").as("total_score"),
                this.db.fn.count("user_game_scores.user_id").as("games"),
            ])
            .where("user_game_scores.game_id", "=", gameId)
            .groupBy("guilds.id")
            .orderBy("total_score", "desc")
            .limit(limit)
            .execute()
    }

    // Complete leaderboard (all games, per user)
    async getCompleteLeaderboard(limit = 100) {
        return await this.db
            .selectFrom("user_game_scores")
            .innerJoin("users", "user_game_scores.user_id", "users.id")
            .select([
                "users.username",
                "users.guild_id",
                this.db.fn.count("user_game_scores.game_id").as("games"),
                this.db.fn.sum("user_game_scores.score").as("total_score"),
            ])
            .groupBy("users.id")
            .orderBy("total_score", "desc")
            .limit(limit)
            .execute()
    }

    async delete(id: number) {
        return await this.db.deleteFrom("user_game_scores").where("id", "=", id).returningAll().executeTakeFirst()
    }
}
