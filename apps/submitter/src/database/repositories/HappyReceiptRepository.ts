import type { Kysely } from "kysely"
import type { DB, HappyReceipt } from "#src/database/generated"
import type { Hash } from "#src/tmp/interface/common_chain"

export class HappyReceiptRepository {
    constructor(private db: Kysely<DB>) {}

    async findByHash(hash: Hash) {
        const query = this.db
            .selectFrom("happy_receipts")
            .select([
                "happy_receipts.happyTxHash",
                "happy_receipts.status",
                "happy_receipts.revertData",
                "happy_receipts.failureReason",
                "happy_receipts.gasUsed",
                "happy_receipts.gasCost",
                "happy_receipts.transactionHash",
            ])
            .innerJoin("happy_transactions", "happy_transactions.happyTxHash", "happy_receipts.happyTxHash")
            .select([
                "happy_transactions.account",
                "happy_transactions.nonceTrack",
                "happy_transactions.nonceValue",
                "happy_transactions.entryPoint",
            ])
            .where("happy_transactions.happyTxHash", "=", hash)

        return await query.executeTakeFirst()
    }

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
