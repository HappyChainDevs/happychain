import { type Migration, type MigrationProvider, Migrator } from "kysely"
import { db } from "./db/driver"
import { migrations } from "./db/migrations"

class ObjectMigrationProvider implements MigrationProvider {
    constructor(private migrations: Record<string, Migration>) {}

    async getMigrations(): Promise<Record<string, Migration>> {
        return this.migrations
    }
}

async function migrateToLatest() {
    const migrator = new Migrator({
        db,
        provider: new ObjectMigrationProvider(migrations),
    })

    const { error, results } = await migrator.migrateToLatest()

    results?.forEach((it) => {
        if (it.status === "Success") {
            console.log(`migration "${it.migrationName}" was executed successfully`)
        } else if (it.status === "Error") {
            console.error(`failed to execute migration "${it.migrationName}"`)
        }
    })

    if (error) {
        console.error("failed to migrate")
        console.error(error)
        process.exit(1)
    }

    await db.destroy()
}

migrateToLatest()
