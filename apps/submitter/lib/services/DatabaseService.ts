import type { Address, Hash } from "@happy.tech/common"
import type { Kysely } from "kysely"
import { type Result, err, ok } from "neverthrow"
import type { DB } from "#lib/database/generated"
import type * as Schema from "#lib/database/generated"
import { Tables } from "#lib/database/tables"
import type { Boop, BoopReceipt, EVMReceipt } from "#lib/types"
import { logger } from "#lib/utils/logger"

/** A boop receipt with no EVM transaction receipt nor logs attached. */
export type PartialBoopReceipt = Omit<BoopReceipt, "logs" | "txReceipt"> & { txHash: Hash }

// biome-ignore format: pretty
export type StoredReceipt =
     Omit<BoopReceipt, "logs" | "txReceipt" | "status">
    & Omit<EVMReceipt, "status" | "type">
    & Pick<Boop, "account" | "nonceTrack" | "nonceValue">
    & { txHash: Hash; entryPoint: Address, status: string, txReceiptStatus: string, type: string }

export class DatabaseService {
    constructor(private db: Kysely<DB>) {}

    async findBoop(boopHash: Hash): Promise<Boop | undefined> {
        return await this.db
            .selectFrom(Tables.Boops)
            .selectAll()
            .where(`${Tables.Boops}.boopHash`, "=", boopHash)
            .executeTakeFirst()
    }

    // @throws SQLiteError
    async saveBoop(entryPoint: Address, boop: Boop, boopHash: Hash): Promise<Schema.Boop | undefined> {
        logger.trace("Saving boop to db", boopHash)
        // We might overwrite previous boops, as the fees & gas limit can change for a boop with the same hash.
        return await this.db
            .replaceInto(Tables.Boops)
            .values({ boopHash, entryPoint, ...boop })
            .returningAll()
            .executeTakeFirst()
    }

    // @throws SQLiteError
    async findReceipt(boopHash: Hash): Promise<StoredReceipt | undefined> {
        // TODO https://kysely.dev/docs/examples/select/nested-object
        const result = await this.db
            .selectFrom(Tables.Receipts)
            .innerJoin(Tables.Boops, `${Tables.Boops}.boopHash`, `${Tables.Receipts}.boopHash`)
            .innerJoin(Tables.EvmReceipts, `${Tables.Boops}.boopHash`, `${Tables.EvmReceipts}.boopHash`)
            .where(`${Tables.Boops}.boopHash`, "=", boopHash)
            .select(`${Tables.Receipts}.boopHash`) // shared
            .select(["txHash", `${Tables.Receipts}.status`, "revertData", "gasUsed", "gasCost", "txHash"]) // from receipts
            .select(["account", "nonceTrack", "nonceValue", "entryPoint"]) // from boops
            .select(["transactionHash", `${Tables.EvmReceipts}.status as txReceiptStatus`, "from", "to"]) // from evm_receipts
            .select(["blockHash", "blockNumber", "effectiveGasPrice", "gasUsed"]) // from evm_receipts
            .select(({ val }) => [val("eip1559").as("type")])
            .executeTakeFirst()

        return result ? (result satisfies StoredReceipt) : undefined
    }

    async saveReceipt(receipt: BoopReceipt): Promise<Result<Schema.Receipt, unknown>> {
        logger.trace("Saving receipt to db", receipt.boopHash)
        const { boopHash, status, revertData, /* gasUsed, */ gasCost, txReceipt } = receipt
        try {
            // TODO boopHash is not unique — there can be more than one attempt to submit, so more than one receipt.
            // We want to update gas and tx receipt when a new receipt comes in (?)
            const result = await this.db
                .replaceInto(Tables.Receipts)
                .values({ boopHash, status, revertData, /* gasUsed, */ gasCost, txHash: txReceipt.transactionHash })
                .returningAll()
                .executeTakeFirst()
            // TODO we probably don't need to return
            return result ? ok(result) : err(new Error("Failed to insert receipt"))
        } catch (error) {
            logger.warn("Error while saving Boop receipt", boopHash)
            return err(error)
        }
    }

    async saveEVMReceipt(boopHash: Hash, evmReceipt: EVMReceipt): Promise<void> {
        try {
            // Get rid of extra properties.
            const { status, transactionHash, from, to, blockHash, blockNumber, effectiveGasPrice, gasUsed } = evmReceipt
            const values = { status, transactionHash, from, to, blockHash, blockNumber, effectiveGasPrice, gasUsed }
            await this.db
                .replaceInto(Tables.EvmReceipts)
                .values({ boopHash, ...values })
                .execute()
        } catch (error) {
            logger.warn("Error while saving EVM receipt", boopHash, evmReceipt.transactionHash, error)
        }
    }
}
