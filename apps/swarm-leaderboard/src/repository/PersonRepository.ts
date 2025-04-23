import { db } from "../db/driver"
import type { NewPerson, Person, PersonUpdate } from "../db/types"

export async function findPersonById(id: number) {
    return await db.selectFrom("person").where("id", "=", id).selectAll().executeTakeFirst()
}

export async function findPeople(criteria: Partial<Person>) {
    let query = db.selectFrom("person")

    if (criteria.id) {
        query = query.where("id", "=", criteria.id) //! Kysely is immutable, you must reassign!
    }

    if (criteria.first_name) {
        query = query.where("first_name", "=", criteria.first_name)
    }

    if (criteria.last_name !== undefined) {
        query = query.where("last_name", criteria.last_name === null ? "is" : "=", criteria.last_name)
    }

    if (criteria.created_at) {
        query = query.where("created_at", "=", criteria.created_at)
    }

    return await query.selectAll().execute()
}

export async function updatePerson(id: number, updateWith: PersonUpdate) {
    return await db.updateTable("person").set(updateWith).where("id", "=", id)
}

export async function createPerson(person: NewPerson) {
    return await db.insertInto("person").values(person).returningAll().executeTakeFirstOrThrow()
}

export async function deletePerson(id: number) {
    return await db.deleteFrom("person").where("id", "=", id).returningAll().executeTakeFirst()
}
