import type { Kysely } from "kysely"
import type { DB, HappyReceipt } from "#src/database/generated"

export class HappyReceiptRepository {
    constructor(private db: Kysely<DB>) {}

    async insert(state: Omit<HappyReceipt, "id">) {
        const { failureReason, gasCost, gasUsed, happyTxHash, revertData, status, transactionHash } = state
        const response = await this.db //
            .insertInto("happy_receipts")
            .values({ failureReason, gasCost, gasUsed, happyTxHash, revertData, status, transactionHash })
            .returningAll()
            .executeTakeFirst()

        return response
    }
}
