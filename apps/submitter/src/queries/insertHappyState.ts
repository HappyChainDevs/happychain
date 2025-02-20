import { db } from "#src/database"
import type { HappyState } from "#src/database/generated"

export async function insertHappyState({ included, status }: Pick<HappyState, "included" | "status">) {
    return await db
        .insertInto("happy_state")
        .values({
            included,
            status,
        })
        .returningAll()
        .executeTakeFirst()
}
