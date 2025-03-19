import "./env-bootstrap"
import fs from "node:fs/promises"
import path, { join } from "node:path"
import { FileMigrationProvider, Migrator } from "kysely"
import { db } from "#src/database"

// Run all migrations (in memory db)
const migrationFolder = join(import.meta.dir, "../../", "./migrations")
const provider = new FileMigrationProvider({ fs, path, migrationFolder })
const { error } = await new Migrator({ db, provider }).migrateToLatest()
if (error) {
    console.error(error)
    throw new Error("[Submitter] Failed to run test migrations")
}
