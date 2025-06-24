import type { Kysely } from "kysely"
import type { Database } from "../types"

export type WatchAssetParams = {
    /** Token type. */
    type: "ERC20"
    options: {
        /** The address of the token contract */
        address: string
        /** A ticker symbol or shorthand, up to 11 characters */
        symbol: string
        /** The number of token decimals */
        decimals: number
        /** A string url of the token logo */
        image?: string | undefined
    }
}

export async function up(db: Kysely<Database>) {
    await db.schema
        .createTable("watchedAssets")
        .addColumn("user", "text", (col) => col.notNull())
        .addColumn("type", "text", (col) => col.notNull())
        .addColumn("address", "text", (col) => col.notNull())
        .addColumn("symbol", "text", (col) => col.notNull())
        .addColumn("decimals", "integer", (col) => col.notNull())
        .addColumn("image", "text")
        .addColumn("id", "text", (col) => col.notNull().primaryKey())
        .addColumn("updatedAt", "integer", (col) => col.notNull())
        .addColumn("createdAt", "integer", (col) => col.notNull())
        .addColumn("deleted", "boolean", (col) => col.notNull())
        .execute()
}

export const migration20250623143000 = { up }
