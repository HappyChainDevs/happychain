import type { Kysely } from "kysely"
import type { Database, Game, UpdateGame, NewGame } from "../db/types"

export class GameRepository {
    constructor(private db: Kysely<Database>) {}

    async findById(id: number): Promise<Game | undefined> {
        return await this.db.selectFrom("games").where("id", "=", id).selectAll().executeTakeFirst()
    }

    async find(criteria: Partial<Game>): Promise<Game[]> {
        let query = this.db.selectFrom("games")
        if (criteria.id) query = query.where("id", "=", criteria.id)
        if (criteria.name) query = query.where("name", "=", criteria.name)
        if (criteria.icon_url) query = query.where("icon_url", "=", criteria.icon_url)
        if (criteria.created_at) query = query.where("created_at", "=", criteria.created_at)
        return await query.selectAll().execute()
    }

    async create(game: NewGame): Promise<Game> {
        return await this.db.insertInto("games").values(game).returningAll().executeTakeFirstOrThrow()
    }

    async update(id: number, updateWith: UpdateGame) {
        return await this.db.updateTable("games").set(updateWith).where("id", "=", id).executeTakeFirst()
    }

    async delete(id: number) {
        return await this.db.deleteFrom("games").where("id", "=", id).returningAll().executeTakeFirst()
    }
}
