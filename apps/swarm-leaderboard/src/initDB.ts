import { db } from "./db/driver"

export async function initDb() {
    await Promise.all([
        createUsersTable(),
        createGuildsTable(),
        createGamesTable(),
        createUserGameScoresTable(),
        createSessionsTable(),
    ])
}

async function createUsersTable() {
    await db.schema
        .createTable("users")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("happy_wallet", "text", (col) => col.notNull().unique())
        .addColumn("name", "text", (col) => col.notNull())
        .addColumn("guild_id", "integer")
        .addColumn("created_at", "text", (col) => col.notNull())
        .execute()
}

async function createGuildsTable() {
    await db.schema
        .createTable("guilds")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("name", "text", (col) => col.notNull())
        .addColumn("code", "text", (col) => col.notNull().unique())
        .addColumn("created_at", "text", (col) => col.notNull())
        .execute()
}

async function createGamesTable() {
    await db.schema
        .createTable("games")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("name", "text", (col) => col.notNull())
        .addColumn("icon_url", "text")
        .addColumn("created_at", "text", (col) => col.notNull())
        .execute()
}

async function createUserGameScoresTable() {
    await db.schema
        .createTable("user_game_scores")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("user_id", "integer", (col) => col.notNull())
        .addColumn("game_id", "integer", (col) => col.notNull())
        .addColumn("score", "integer", (col) => col.notNull())
        .addColumn("played_at", "text", (col) => col.notNull())
        .execute()
}

async function createSessionsTable() {
    await db.schema
        .createTable("sessions")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("user_id", "integer", (col) => col.notNull())
        .addColumn("session_uuid", "text", (col) => col.notNull().unique())
        .addColumn("created_at", "text", (col) => col.notNull())
        .addColumn("expires_at", "text")
        .execute()
}
