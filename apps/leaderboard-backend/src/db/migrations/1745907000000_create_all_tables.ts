import type { Kysely } from "kysely"
import { sql } from "kysely"

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
    // Users table
    await db.schema
        .createTable("users")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("primary_wallet", "text", (col) => col.notNull().unique())
        .addColumn("username", "text", (col) => col.notNull().unique())
        .addColumn("created_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn("updated_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .execute()

    // User wallets table (multiple wallets per user)
    await db.schema
        .createTable("user_wallets")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("user_id", "integer", (col) => col.notNull())
        .addColumn("wallet_address", "text", (col) => col.notNull().unique())
        .addColumn("is_primary", "boolean", (col) => col.notNull().defaultTo(false))
        .addColumn("created_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addForeignKeyConstraint("user_wallets_user_id_fk", ["user_id"], "users", ["id"])
        .execute()

    // Guilds table
    await db.schema
        .createTable("guilds")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("name", "text", (col) => col.notNull().unique())
        .addColumn("icon_url", "text", (col) => col)
        .addColumn("creator_id", "integer", (col) => col.notNull())
        .addColumn("created_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn("updated_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addForeignKeyConstraint("guilds_creator_id_fk", ["creator_id"], "users", ["id"])
        .execute()

    // Guild members table (many-to-many users <-> guilds)
    await db.schema
        .createTable("guild_members")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("guild_id", "integer", (col) => col.notNull())
        .addColumn("user_id", "integer", (col) => col.notNull())
        .addColumn("role", "text", (col) => col.notNull().defaultTo("member")) // Only values from GuildRole enum allowed; enforced in code
        .addColumn("joined_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addForeignKeyConstraint("guild_members_guild_id_fk", ["guild_id"], "guilds", ["id"])
        .addForeignKeyConstraint("guild_members_user_id_fk", ["user_id"], "users", ["id"])
        .addUniqueConstraint("guild_members_unique", ["guild_id", "user_id"])
        .execute()

    // Games table
    await db.schema
        .createTable("games")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("name", "text", (col) => col.notNull().unique())
        .addColumn("icon_url", "text", (col) => col)
        .addColumn("description", "text", (col) => col)
        .addColumn("admin_id", "integer", (col) => col.notNull())
        .addColumn("created_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn("updated_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addForeignKeyConstraint("games_admin_id_fk", ["admin_id"], "users", ["id"])
        .execute()

    // User game scores table
    await db.schema
        .createTable("user_game_scores")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("user_id", "integer", (col) => col.notNull())
        .addColumn("game_id", "integer", (col) => col.notNull())
        .addColumn("role", "text", (col) => col.notNull().defaultTo("player")) // Only values from GameRole enum allowed; enforced in code
        .addColumn("score", "integer", (col) => col.notNull())
        .addColumn("metadata", "text", (col) => col)
        .addColumn("created_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn("updated_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addForeignKeyConstraint("user_game_scores_user_id_fk", ["user_id"], "users", ["id"])
        .addForeignKeyConstraint("user_game_scores_game_id_fk", ["game_id"], "games", ["id"])
        .addUniqueConstraint("user_game_scores_unique", ["user_id", "game_id"])
        .execute()

    // Auth sessions table
    await db.schema
        .createTable("auth_sessions")
        .addColumn("id", "uuid", (col) => col.primaryKey().notNull())
        .addColumn("user_id", "integer", (col) => col.notNull())
        .addColumn("primary_wallet", "text", (col) => col.notNull())
        .addColumn("created_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn("last_used_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addForeignKeyConstraint("auth_sessions_user_id_fk", ["user_id"], "users", ["id"])
        .execute()
}

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable("user_game_scores").execute()
    await db.schema.dropTable("games").execute()
    await db.schema.dropTable("guild_members").execute()
    await db.schema.dropTable("guilds").execute()
    await db.schema.dropTable("user_wallets").execute()
    await db.schema.dropTable("users").execute()
    await db.schema.dropTable("auth_sessions").execute()
}
