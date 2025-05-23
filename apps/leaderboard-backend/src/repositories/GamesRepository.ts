import type { Kysely } from "kysely"
import { GameRole } from "../auth/roles"
import type { Database, Game, GameTableId, NewGame, UpdateGame, UserGameScore, UserTableId } from "../db/types"

export class GameRepository {
    constructor(private db: Kysely<Database>) {}

    async findById(id: GameTableId): Promise<Game | undefined> {
        try {
            return await this.db.selectFrom("games").where("id", "=", id).selectAll().executeTakeFirstOrThrow()
        } catch (error) {
            console.error("Error finding game by ID:", error)
            return undefined
        }
    }

    async findByNameLike(name: string): Promise<Game[]> {
        try {
            return await this.db.selectFrom("games").where("name", "like", `%${name}%`).selectAll().execute()
        } catch (error) {
            console.error("Error finding games by name like:", error)
            return []
        }
    }

    async findByExactName(name: string): Promise<Game | undefined> {
        try {
            return await this.db.selectFrom("games").where("name", "=", name).selectAll().executeTakeFirstOrThrow()
        } catch (error) {
            console.error("Error finding game by exact name:", error)
            return undefined
        }
    }

    async findByAdmin(adminId: UserTableId): Promise<Game[]> {
        try {
            return await this.db.selectFrom("games").where("admin_id", "=", adminId).selectAll().execute()
        } catch (error) {
            console.error("Error finding games by admin:", error)
            return []
        }
    }

    async find(criteria: {
        name?: string
        admin_id?: UserTableId
    }): Promise<Game[]> {
        try {
            const { name, admin_id } = criteria

            return await this.db
                .selectFrom("games")
                .$if(typeof name === "string" && name.length > 0, (qb) => qb.where("name", "like", `%${name}%`))
                .$if(typeof admin_id === "number", (qb) => qb.where("admin_id", "=", admin_id as UserTableId))
                .selectAll()
                .execute()
        } catch (error) {
            console.error("Error finding games by criteria:", error)
            return []
        }
    }

    async create(game: NewGame): Promise<Game | undefined> {
        try {
            const now = new Date().toISOString()
            return await this.db
                .insertInto("games")
                .values({
                    ...game,
                    created_at: now,
                    updated_at: now,
                })
                .returningAll()
                .executeTakeFirstOrThrow()
        } catch (error) {
            console.error("Error creating game:", error)
            return undefined
        }
    }

    async update(id: GameTableId, updateWith: UpdateGame): Promise<Game | undefined> {
        try {
            await this.db
                .updateTable("games")
                .set({ ...updateWith, updated_at: new Date().toISOString() })
                .where("id", "=", id)
                .executeTakeFirstOrThrow()

            return this.findById(id)
        } catch (error) {
            console.error("Error updating game:", error)
            return undefined
        }
    }

    async delete(id: GameTableId): Promise<Game | undefined> {
        try {
            return await this.db.transaction().execute(async (trx) => {
                const game = await trx.selectFrom("games").where("id", "=", id).selectAll().executeTakeFirst()
                if (!game) {
                    return undefined
                }

                await trx.deleteFrom("user_game_scores").where("game_id", "=", id).executeTakeFirstOrThrow()
                await trx.deleteFrom("games").where("id", "=", id).executeTakeFirstOrThrow()

                return game
            })
        } catch (error) {
            console.error("Error deleting game:", error)
            return undefined
        }
    }
}

export class GameScoreRepository {
    constructor(private db: Kysely<Database>) {}

    async findUserGameScore(userId: UserTableId, gameId: GameTableId): Promise<UserGameScore | undefined> {
        try {
            return await this.db
                .selectFrom("user_game_scores")
                .where("user_id", "=", userId)
                .where("game_id", "=", gameId)
                .selectAll()
                .executeTakeFirstOrThrow()
        } catch (error) {
            console.error("Error finding user game score:", error)
            return undefined
        }
    }

    async findUserScores(
        userId: UserTableId,
        gameId?: GameTableId,
    ): Promise<(UserGameScore & { game_name: string })[]> {
        try {
            return await this.db
                .selectFrom("user_game_scores")
                .innerJoin("games", "games.id", "user_game_scores.game_id")
                .where("user_game_scores.user_id", "=", userId)
                .$if(gameId !== undefined && typeof gameId === "number", (qb) =>
                    qb.where("user_game_scores.game_id", "=", gameId!),
                )
                .select([
                    "user_game_scores.id",
                    "user_game_scores.game_id",
                    "user_game_scores.user_id",
                    "user_game_scores.role",
                    "user_game_scores.score",
                    "user_game_scores.metadata",
                    "user_game_scores.created_at",
                    "user_game_scores.updated_at",
                    "games.name as game_name",
                ])
                .execute()
        } catch (error) {
            console.error("Error finding user scores:", error)
            return []
        }
    }

    async findGameScores(gameId: GameTableId, limit = 50): Promise<(UserGameScore & { username: string })[]> {
        try {
            return await this.db
                .selectFrom("user_game_scores")
                .innerJoin("users", "users.id", "user_game_scores.user_id")
                .where("user_game_scores.game_id", "=", gameId)
                .select([
                    "user_game_scores.id",
                    "user_game_scores.game_id",
                    "user_game_scores.user_id",
                    "user_game_scores.role",
                    "user_game_scores.score",
                    "user_game_scores.metadata",
                    "user_game_scores.created_at",
                    "user_game_scores.updated_at",
                    "users.username",
                ])
                .orderBy("user_game_scores.score", "desc")
                .limit(limit)
                .execute()
        } catch (error) {
            console.error("Error finding game scores:", error)
            return []
        }
    }

    async submitScore(
        userId: UserTableId,
        gameId: GameTableId,
        score: number,
        metadata?: string,
    ): Promise<UserGameScore | undefined> {
        try {
            const existingScore = await this.findUserGameScore(userId, gameId)
            const now = new Date().toISOString()

            if (existingScore) {
                const newScore = existingScore.score + score
                return await this.db
                    .updateTable("user_game_scores")
                    .set({
                        score: newScore,
                        metadata: metadata !== undefined ? metadata : existingScore.metadata,
                        updated_at: now,
                    })
                    .where("id", "=", existingScore.id)
                    .returningAll()
                    .executeTakeFirstOrThrow()
            } else {
                return await this.db
                    .insertInto("user_game_scores")
                    .values({
                        user_id: userId,
                        game_id: gameId,
                        role: GameRole.PLAYER, // Default role for new score submissions
                        score,
                        metadata,
                        created_at: now,
                        updated_at: now,
                    })
                    .returningAll()
                    .executeTakeFirstOrThrow()
            }
        } catch (error) {
            console.error("Error submitting score:", error)
            return undefined
        }
    }

    async deleteScore(userId: UserTableId, gameId: GameTableId): Promise<UserGameScore | undefined> {
        try {
            return await this.db
                .deleteFrom("user_game_scores")
                .where("user_id", "=", userId)
                .where("game_id", "=", gameId)
                .returningAll()
                .executeTakeFirstOrThrow()
        } catch (error) {
            console.error("Error deleting score:", error)
            return undefined
        }
    }
}
