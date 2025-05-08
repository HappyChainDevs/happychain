import type { Kysely } from "kysely"
import type { Database, Game, GameTableId, NewGame, UpdateGame, UserGameScore, UserTableId } from "../db/types"

export class GameRepository {
    constructor(private db: Kysely<Database>) {}

    async findById(id: GameTableId): Promise<Game | undefined> {
        return await this.db.selectFrom("games").where("id", "=", id).selectAll().executeTakeFirst()
    }

    async findByNameLike(name: string): Promise<Game[]> {
        return await this.db.selectFrom("games").where("name", "like", `%${name}%`).selectAll().execute()
    }

    async findByExactName(name: string): Promise<Game | undefined> {
        return await this.db.selectFrom("games").where("name", "=", name).selectAll().executeTakeFirst()
    }

    async findByAdmin(adminId: UserTableId): Promise<Game[]> {
        return await this.db.selectFrom("games").where("admin_id", "=", adminId).selectAll().execute()
    }

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

    async create(game: NewGame): Promise<Game> {
        return await this.db.insertInto("games").values(game).returningAll().executeTakeFirstOrThrow()
    }

    async update(id: GameTableId, updateWith: UpdateGame): Promise<Game | undefined> {
        await this.db
            .updateTable("games")
            .set({ ...updateWith, updated_at: new Date().toISOString() })
            .where("id", "=", id)
            .execute()

        return this.findById(id)
    }

    async delete(id: GameTableId): Promise<Game | undefined> {
        return await this.db.transaction().execute(async (trx) => {
            // Get game before deletion
            const game = await trx.selectFrom("games").where("id", "=", id).selectAll().executeTakeFirst()

            if (!game) {
                return undefined
            }

            await trx.deleteFrom("user_game_scores").where("game_id", "=", id).execute()
            await trx.deleteFrom("games").where("id", "=", id).execute()

            return game
        })
    }
}

export class GameScoreRepository {
    constructor(private db: Kysely<Database>) {}

    async findUserGameScore(userId: UserTableId, gameId: GameTableId): Promise<UserGameScore | undefined> {
        return await this.db
            .selectFrom("user_game_scores")
            .where("user_id", "=", userId)
            .where("game_id", "=", gameId)
            .selectAll()
            .executeTakeFirst()
    }

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

    async submitScore(
        userId: UserTableId,
        gameId: GameTableId,
        score: number,
        metadata?: string,
    ): Promise<UserGameScore> {
        const existingScore = await this.findUserGameScore(userId, gameId)

        if (existingScore) {
            const newScore = existingScore.score + score
            return await this.db
                .updateTable("user_game_scores")
                .set({
                    score: newScore,
                    metadata: metadata !== undefined ? metadata : existingScore.metadata,
                    updated_at: new Date().toISOString(),
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
                    score,
                    metadata,
                })
                .returningAll()
                .executeTakeFirstOrThrow()
        }
    }

    async deleteScore(userId: UserTableId, gameId: GameTableId): Promise<UserGameScore | undefined> {
        return await this.db
            .deleteFrom("user_game_scores")
            .where("user_id", "=", userId)
            .where("game_id", "=", gameId)
            .returningAll()
            .executeTakeFirst()
    }
}
