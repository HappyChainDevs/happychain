import type { Kysely } from "kysely"
import type { Database, NewUserGameScore, UpdateUserGameScore, UserGameScore } from "../db/types"

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
        if (criteria.played_at) query = query.where("played_at", "=", criteria.played_at)
        return await query.selectAll().execute()
    }

    async create(score: NewUserGameScore): Promise<UserGameScore> {
        return await this.db.insertInto("user_game_scores").values(score).returningAll().executeTakeFirstOrThrow()
    }

    async update(id: number, updateWith: UpdateUserGameScore) {
        return await this.db.updateTable("user_game_scores").set(updateWith).where("id", "=", id).executeTakeFirst()
    }

    async delete(id: number) {
        return await this.db.deleteFrom("user_game_scores").where("id", "=", id).returningAll().executeTakeFirst()
    }
}
