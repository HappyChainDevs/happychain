import type { Kysely } from "kysely"

import { jsonObjectFrom } from "kysely/helpers/sqlite"
import type { DB, HappyState } from "#src/database/generated"

export class HappyStateRepository {
    constructor(private db: Kysely<DB>) {}

    async fetchByHash(hash: `0x${string}`) {
        return await this.db //
            .selectFrom("happy_states")
            .where(({ exists, selectFrom }) =>
                exists(
                    selectFrom("happy_receipts")
                        .whereRef("happy_receipts.id", "=", "happy_states.happyReceiptId")
                        .where("happy_receipts.happyTxHash", "=", hash),
                ),
            )
            .selectAll("happy_states")
            .executeTakeFirst()
    }
    async fetchByHashWithReceipt(hash: `0x${string}`) {
        const query = this.db //
            .selectFrom("happy_states")
            .where(({ exists, selectFrom }) =>
                exists(
                    selectFrom("happy_receipts")
                        .select("id")
                        .whereRef("happy_receipts.id", "=", "happy_states.happyReceiptId")
                        .where("happy_receipts.happyTxHash", "=", hash),
                ),
            )
            .select(["included", "status"])
            .select((eb) => [
                jsonObjectFrom(
                    eb
                        .selectFrom("happy_receipts")
                        .select([
                            // "account",
                            // "entryPoint",
                            // "nonceTrack",
                            // "nonceValue",
                            "failureReason",
                            "gasCost",
                            "gasUsed",
                            "happyTxHash",
                            "revertData",
                            "status",
                            "transactionHash",
                        ])
                        .whereRef("happy_receipts.id", "=", "happy_states.happyReceiptId")
                        .where("happy_receipts.happyTxHash", "=", hash)
                        .limit(1),
                ).as("happyReceipt"),
            ])

        return await query.executeTakeFirst().then((a) => ({
            ...a,
            // converts JSON string to proper
            happyReceipt: a?.happyReceipt ? JSON.parse(a.happyReceipt.toString()) : null,
        }))
    }

    async insert(state: Omit<HappyState, "id">) {
        return await this.db //
            .insertInto("happy_states")
            .values(state)
            .returningAll()
            .executeTakeFirst()
    }

    async update(id: HappyState["id"], updates: Partial<Omit<HappyState, "id">>) {
        return await this.db
            .updateTable("happy_states")
            .set(updates)
            .where("id", "=", id)
            .returningAll()
            .executeTakeFirst()
    }
}
