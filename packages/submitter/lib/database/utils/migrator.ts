import { Migrator } from "kysely"
import { db } from "#lib/database/db"
import { migrations } from "#lib/database/migrations"
import { ObjectMigrationProvider } from "./ObjectMigrationProvider"

export const migrator = new Migrator({
    db,
    provider: new ObjectMigrationProvider(migrations),
})
