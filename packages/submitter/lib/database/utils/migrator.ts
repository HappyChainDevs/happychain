import { Migrator } from "kysely"
import { db } from ".."
import { migrations } from "../migrations"
import { ObjectMigrationProvider } from "./ObjectMigrationProvider"

export const migrator = new Migrator({
    db,
    provider: new ObjectMigrationProvider(migrations),
})
