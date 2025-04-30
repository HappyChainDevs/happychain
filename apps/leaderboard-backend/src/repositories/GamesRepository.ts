import type { Kysely } from "kysely"
import type { Database, Game, GameTableId, NewGame, UpdateGame, UserGameScore, UserTableId } from "../db/types"

export class GameRepository {
    constructor(private db: Kysely<Database>) {}

    /// Find a game by ID
    async findById(id: GameTableId): Promise<Game | undefined> {
        return await this.db.selectFrom("games").where("id", "=", id).selectAll().executeTakeFirst()
    }

    /// Find games by name (partial match)
    async findByNameLike(name: string): Promise<Game[]> {
        return await this.db.selectFrom("games").where("name", "like", `%${name}%`).selectAll().execute()
    }

    /// Find a game by exact name
    async findByExactName(name: string): Promise<Game | undefined> {
        return await this.db.selectFrom("games").where("name", "=", name).selectAll().executeTakeFirst()
    }

    /// Find games by admin
    async findByAdmin(adminId: UserTableId): Promise<Game[]> {
        return await this.db.selectFrom("games").where("admin_id", "=", adminId).selectAll().execute()
    }

    /// Generic find method with search criteria
    async find(criteria: {
        name?: string
        admin_id?: UserTableId
    }): Promise<Game[]> {
        const { name, admin_id } = criteria

        return await this.db
            .selectFrom("games")
            .$if(typeof name === "string" && name.length > 0, (qb) => qb.where("name", "like", `%${name}%`))
            .$if(typeof admin_id === "number", (qb) => qb.where("admin_id", "=", admin_id as UserTableId))
            .selectAll()
            .execute()
    }

    /// Create a new game
    async create(game: NewGame): Promise<Game> {
        return await this.db.insertInto("games").values(game).returningAll().executeTakeFirstOrThrow()
    }

    /// Update game details
    async update(id: GameTableId, updateWith: UpdateGame): Promise<Game | undefined> {
        await this.db.updateTable("games").set(updateWith).where("id", "=", id).execute()

        return this.findById(id)
    }

    /// Delete a game
    async delete(id: GameTableId): Promise<Game | undefined> {
        return await this.db.transaction().execute(async (trx) => {
            // Get game before deletion
            const game = await trx.selectFrom("games").where("id", "=", id).selectAll().executeTakeFirst()

            if (!game) {
                return undefined
            }

            // Delete all scores for this game
            await trx.deleteFrom("user_game_scores").where("game_id", "=", id).execute()

            // Delete the game
            await trx.deleteFrom("games").where("id", "=", id).execute()

            return game
        })
    }

    /// Check if user is admin of a game
    async isUserGameAdmin(userId: UserTableId, gameId: GameTableId): Promise<boolean> {
        const game = await this.db
            .selectFrom("games")
            .where("id", "=", gameId)
            .where("admin_id", "=", userId)
            .executeTakeFirst()

        return !!game
    }
}

export class GameScoreRepository {
    constructor(private db: Kysely<Database>) {}

    /// Find a user's score for a specific game
    async findUserGameScore(userId: UserTableId, gameId: GameTableId): Promise<UserGameScore | undefined> {
        return await this.db
            .selectFrom("user_game_scores")
            .where("user_id", "=", userId)
            .where("game_id", "=", gameId)
            .selectAll()
            .executeTakeFirst()
    }

    /// Get all scores for a user
    async findUserScores(
        userId: UserTableId,
        gameId?: GameTableId,
    ): Promise<(UserGameScore & { game_name: string })[]> {
        return await this.db
            .selectFrom("user_game_scores")
            .innerJoin("games", "games.id", "user_game_scores.game_id")
            .where("user_game_scores.user_id", "=", userId)
            .$if(typeof gameId === "number", (qb) => qb.where("user_game_scores.game_id", "=", gameId as GameTableId))
            .select([
                "user_game_scores.id",
                "user_game_scores.game_id",
                "user_game_scores.user_id",
                "user_game_scores.score",
                "user_game_scores.metadata",
                "user_game_scores.created_at",
                "user_game_scores.updated_at",
                "games.name as game_name",
            ])
            .execute()
    }

    /// Get all scores for a game
    async findGameScores(gameId: GameTableId, limit = 50): Promise<(UserGameScore & { username: string })[]> {
        return await this.db
            .selectFrom("user_game_scores")
            .innerJoin("users", "users.id", "user_game_scores.user_id")
            .where("user_game_scores.game_id", "=", gameId)
            .select([
                "user_game_scores.id",
                "user_game_scores.game_id",
                "user_game_scores.user_id",
                "user_game_scores.score",
                "user_game_scores.metadata",
                "user_game_scores.created_at",
                "user_game_scores.updated_at",
                "users.username",
            ])
            .orderBy("user_game_scores.score", "desc")
            .limit(limit)
            .execute()
    }

    /// Submit a score (create or update if higher)
    async submitScore(
        userId: UserTableId,
        gameId: GameTableId,
        score: number,
        metadata?: string,
    ): Promise<UserGameScore> {
        // Check if score exists for this user and game
        const existingScore = await this.findUserGameScore(userId, gameId)

        if (existingScore) {
            // Update existing score if new score is higher
            if (score > existingScore.score) {
                return await this.db
                    .updateTable("user_game_scores")
                    .set({
                        score,
                        metadata: metadata || existingScore.metadata,
                    })
                    .where("id", "=", existingScore.id)
                    .returningAll()
                    .executeTakeFirstOrThrow()
            }
            return existingScore
        } else {
            // Create new score
            return await this.db
                .insertInto("user_game_scores")
                .values({
                    user_id: userId,
                    game_id: gameId,
                    score,
                    metadata,
                })
                .returningAll()
                .executeTakeFirstOrThrow()
        }
    }

    /// Delete a score
    async deleteScore(userId: UserTableId, gameId: GameTableId): Promise<UserGameScore | undefined> {
        return await this.db
            .deleteFrom("user_game_scores")
            .where("user_id", "=", userId)
            .where("game_id", "=", gameId)
            .returningAll()
            .executeTakeFirst()
    }
}
