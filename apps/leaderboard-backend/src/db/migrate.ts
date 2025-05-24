import { type Migration, type MigrationProvider, Migrator } from "kysely"
import { db } from "./driver"
import { migrations } from "./migrations"

class ObjectMigrationProvider implements MigrationProvider {
    constructor(private migrations: Record<string, Migration>) {}
    async getMigrations(): Promise<Record<string, Migration>> {
        return this.migrations
    }
}

const migrator = new Migrator({
    db,
    provider: new ObjectMigrationProvider(migrations),
})

async function migrateToLatest() {
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
