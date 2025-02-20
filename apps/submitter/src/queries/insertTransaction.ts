import { db } from "#src/database"
import type { Transaction } from "#src/database/generated"

export async function insertTransaction(tx: Omit<Transaction, "id">) {
    return await db
        .insertInto("transactions")
        .values({
            hash: tx.hash,
            blockNumber: tx.blockNumber,
        })
        .returningAll()
        .executeTakeFirst()
}
