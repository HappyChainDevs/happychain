import type { Kysely } from "kysely"
import type { Database, NewSession, Session, UpdateSession } from "../db/types"

export class SessionRepository {
    constructor(private db: Kysely<Database>) {}

    async findById(id: number): Promise<Session | undefined> {
        return await this.db.selectFrom("sessions").where("id", "=", id).selectAll().executeTakeFirst()
    }

    async find(criteria: Partial<Session>): Promise<Session[]> {
        let query = this.db.selectFrom("sessions")
        if (criteria.id) query = query.where("id", "=", criteria.id)
        if (criteria.user_id) query = query.where("user_id", "=", criteria.user_id)
        if (criteria.session_uuid) query = query.where("session_uuid", "=", criteria.session_uuid)
        if (criteria.created_at) query = query.where("created_at", "=", criteria.created_at)
        return await query.selectAll().execute()
    }

    async create(session: NewSession): Promise<Session> {
        return await this.db.insertInto("sessions").values(session).returningAll().executeTakeFirstOrThrow()
    }

    async update(id: number, updateWith: UpdateSession) {
        return await this.db.updateTable("sessions").set(updateWith).where("id", "=", id).executeTakeFirst()
    }

    async delete(id: number) {
        return await this.db.deleteFrom("sessions").where("id", "=", id).returningAll().executeTakeFirst()
    }
}
