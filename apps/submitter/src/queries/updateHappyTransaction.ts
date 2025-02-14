import { db } from "#src/database"
import type { HappyTransaction } from "#src/database/types"

export async function updateHappyTransaction(id: HappyTransaction["id"], updates: Partial<HappyTransaction>) {
    return await db
        .updateTable("happy_transactions")
        .set({
            // only update transactionId for now
            transactionId: Number(updates.transactionId),
        })
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirst()
}
