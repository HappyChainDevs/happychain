import { type Hash, bigIntReplacer, bigIntReviver } from "@happy.tech/common"
import type { Kysely } from "kysely"
import type { DB } from "#lib/database/generated"
import { computeHash } from "#lib/services"
import { TraceMethod } from "#lib/telemetry/traces.ts"
import type { BoopReceipt } from "#lib/types"
import { logger } from "#lib/utils/logger"

export class DatabaseService {
    constructor(private db: Kysely<DB>) {}

    // @throws SQLiteError
    @TraceMethod("DatabaseService.findReceipt")
    async findReceipt(boopHash: Hash): Promise<BoopReceipt | undefined> {
        try {
            const storedBoop = await this.db
                .selectFrom("boops")
                .selectAll()
                .where("boopHash", "=", boopHash)
                .executeTakeFirst()
            const storedReceipt = await this.db
                .selectFrom("receipts")
                .selectAll()
                .where("boopHash", "=", boopHash)
                .executeTakeFirst()
            if (!!storedBoop !== !!storedReceipt)
                logger.error("Found orphaned boop or receipt", storedBoop, storedReceipt)
            if (!storedBoop || !storedReceipt) return
            const { entryPoint, boopHash: _, ...boop } = storedBoop
            const { logs, ...receipt } = storedReceipt
            return { ...receipt, boop, entryPoint, logs: JSON.parse(logs, bigIntReviver) }
        } catch (error) {
            logger.error("Error while looking up receipt", boopHash, error)
            throw error
        }
    }

    // @throws SQLiteError
    @TraceMethod("DatabaseService.saveReceipt")
    async saveReceipt(receipt: BoopReceipt): Promise<void> {
        logger.trace("Saving receipt to db", receipt.boopHash)
        const { boop, logs, entryPoint, ...rest } = receipt
        const boopHash = computeHash(boop)
        try {
            await this.db.transaction().execute(async (tx) => {
                await tx
                    .insertInto("receipts")
                    .values({ ...rest, logs: JSON.stringify(logs, bigIntReplacer) })
                    .execute()
                await tx
                    .insertInto("boops")
                    .values({ boopHash, entryPoint, ...boop })
                    .execute()
            })
        } catch (error) {
            logger.error("Error while saving Boop receipt", receipt.boopHash, error)
            throw error
        }
    }
}
