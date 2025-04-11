import { type Migration, type MigrationProvider, type MigrationResultSet, Migrator } from "kysely"
import { z } from "zod"
import { db } from "#lib/database"
import env from "#lib/env"
import { type getCommand, showHelp } from "../utils"

import { migrations } from "../../database/migrations"

class ObjectMigrationProvider implements MigrationProvider {
    constructor(private migrations: Record<string, Migration>) {}

    async getMigrations(): Promise<Record<string, Migration>> {
        return this.migrations
    }
}

export async function migrateCommand({ positionals }: ReturnType<typeof getCommand>) {
    const provider = new ObjectMigrationProvider(migrations)
    const migrator = new Migrator({ db, provider })

    const command = z.enum(["latest", "up", "down"]).safeParse(positionals[0])

    switch (command.data) {
        case "latest": {
            console.log(`\nMigrating Latest: ${env.DATABASE_URL}\n`)
            const results = await migrator.migrateToLatest()
            await processMigrationResults(results)
            break
        }
        case "up": {
            console.log(`\nMigrating Up: ${env.DATABASE_URL}\n`)
            const results = await migrator.migrateUp()
            await processMigrationResults(results)
            break
        }
        case "down": {
            console.log(`\nMigrating Down: ${env.DATABASE_URL}\n`)
            const results = await migrator.migrateDown()
            await processMigrationResults(results)
            break
        }
        default:
            if (positionals[0]) console.error(`Unknown command: ${positionals[0]}`)
            showHelp()
            process.exit(1)
    }
}

async function processMigrationResults({ error, results }: MigrationResultSet) {
    if (results?.length) {
        for (const result of results) {
            console.log(`[${result.status}] ${result.direction} ${result.migrationName}`)
        }
    } else if (!error) {
        console.log("No migrations were run")
    }

    if (error) console.error(error)
}
