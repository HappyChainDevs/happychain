import type { Hash } from "@happy.tech/common"
import type { Insertable, Kysely } from "kysely"
import type { BoopReceipt, DB } from "#lib/database/generated"

export class BoopReceiptRepository {
    constructor(private db: Kysely<DB>) {}

    async findByBoopHash(happyHash: Hash) {
        const query = this.selectReceiptsQuery().where("boop_receipts.boopHash", "=", happyHash)
        return await query.executeTakeFirst()
    }

    private selectReceiptsQuery() {
        return this.db
            .selectFrom("boop_receipts")
            .select([
                "boop_receipts.boopHash",
                "boop_receipts.status",
                "boop_receipts.revertData",
                "boop_receipts.gasUsed",
                "boop_receipts.gasCost",
                "boop_receipts.transactionHash",
            ])
            .innerJoin("boop_transactions", "boop_transactions.boopHash", "boop_receipts.boopHash")
            .select([
                "boop_transactions.account",
                "boop_transactions.nonceTrack",
                "boop_transactions.nonceValue",
                "boop_transactions.entryPoint",
            ])
    }

    async insert(state: Insertable<BoopReceipt>): Promise<BoopReceipt | undefined> {
        const { gasCost, gasUsed, boopHash, revertData, status, transactionHash } = state
        const response = await this.db //
            .insertInto("boop_receipts")
            .values({ gasCost, gasUsed, boopHash, revertData, status, transactionHash })
            .returningAll()
            .executeTakeFirst()

        return response
    }
}
