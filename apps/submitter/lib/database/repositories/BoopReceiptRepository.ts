import type { Hash } from "@happy.tech/common"
import type { Insertable, Kysely } from "kysely"
import { type Result, err, ok } from "neverthrow"
import type * as Schema from "#lib/database/generated"
import { Tables, auto } from "#lib/database/tables"
import { resultifyAsync } from "#lib/utils/resultify"

export class BoopReceiptRepository {
    constructor(private db: Kysely<Schema.DB>) {}

    async findByBoopHash(happyHash: Hash) {
        return await resultifyAsync(
            this.db
                .selectFrom(Tables.Receipts)
                .select(["txHash", "status", "revertData", "gasUsed", "gasCost", "txHash"])
                .innerJoin(Tables.Boops, `${Tables.Boops}.boopHash`, `${Tables.Receipts}.boopHash`)
                .select(["account", "nonceTrack", "nonceValue", "entryPoint"])
                .where(`${Tables.Boops}.boopHash`, "=", happyHash)
                .executeTakeFirst(),
        )
    }

    async insert(state: Insertable<Schema.Receipt>): Promise<Result<Schema.Receipt, unknown>> {
        const { gasCost, gasUsed, boopHash, revertData, status, txHash } = state
        try {
            // TODO boopHash is not unique — there can be more than one attempt to submit, so more than one receipt
            // We want to update gas and tx receipt when a new receipt comes in (?)
            const result = await this.db
                .replaceInto(Tables.Receipts)
                .values({ id: auto, gasCost, gasUsed, boopHash, revertData, status, txHash })
                .returningAll()
                .executeTakeFirst()
            return result ? ok(result) : err(new Error("Failed to insert receipt"))
        } catch (error) {
            return err(error)
        }
    }
}
