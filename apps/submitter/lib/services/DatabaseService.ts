import { type Address, type Hash, bigIntReplacer, bigIntReviver } from "@happy.tech/common"
import type { Kysely } from "kysely"
import type { DB } from "#lib/database/generated"
import { computeHash } from "#lib/services"
import type { Boop, BoopReceipt } from "#lib/types"
import { logger } from "#lib/utils/logger"

export class DatabaseService {
    constructor(private db: Kysely<DB>) {}

    // @throws SQLiteError
    async findBoop(boopHash: Hash): Promise<Boop | undefined> {
        try {
            return await this.db.selectFrom("boops").selectAll().where("boopHash", "=", boopHash).executeTakeFirst()
        } catch (error) {
            logger.error("Error while looking up boop", boopHash, error)
            throw error
        }
    }

    // @throws SQLiteError
    async saveBoop(entryPoint: Address, boop: Boop): Promise<void> {
        const boopHash = computeHash(boop)
        try {
            logger.trace("Saving boop to db", boopHash)
            // We might overwrite previous boops, as the fees & gas limit can change for a boop with the same hash.
            await this.db
                .replaceInto("boops")
                .values({ boopHash, entryPoint, ...boop })
                .returningAll()
                .executeTakeFirst()
        } catch (error) {
            logger.error("Error while saving boop", boopHash, error)
            throw error
        }
    }

    // @throws SQLiteError
    async findReceiptOrBoop(boopHash: Hash): Promise<{ boop?: Boop; receipt?: BoopReceipt }> {
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
            if (!storedBoop) return {}
            if (!storedReceipt) return { boop: storedBoop }
            const { entryPoint, ...boop } = storedBoop
            const { logs, ...receipt } = storedReceipt
            return {
                boop,
                receipt: { ...receipt, boop, entryPoint, logs: JSON.parse(logs, bigIntReviver) },
            }
        } catch (error) {
            logger.error("Error while looking up boop receipt", boopHash, error)
            throw error
        }
    }

    // @throws SQLiteError
    async saveReceipt(receipt: BoopReceipt): Promise<void> {
        logger.trace("Saving receipt to db", receipt.boopHash)
        const { boop, logs, entryPoint: _, ...rest } = receipt
        try {
            await this.db
                .replaceInto("receipts")
                .values({ ...rest, logs: JSON.stringify(logs, bigIntReplacer) })
                .execute()
        } catch (error) {
            logger.error("Error while saving Boop receipt", receipt.boopHash, error)
            throw error
        }
    }
}
