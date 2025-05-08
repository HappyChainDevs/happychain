import { z } from "zod"
import { type getCommand, showHelp } from "#lib/cli/utils"
import { migrator } from "#lib/database/utils/migrator"
import { printMigrationResults } from "#lib/database/utils/printMigrationResults"
import { env } from "#lib/env"

export async function migrateCommand({ positionals }: ReturnType<typeof getCommand>) {
    const command = z.enum(["latest", "up", "down"]).safeParse(positionals[0])

    switch (command.data) {
        case "latest": {
            console.log(`\nMigrating Latest: ${env.DATABASE_URL}\n`)
            const results = await migrator.migrateToLatest()
            await printMigrationResults(results)
            break
        }
        case "up": {
            console.log(`\nMigrating Up: ${env.DATABASE_URL}\n`)
            const results = await migrator.migrateUp()
            await printMigrationResults(results)
            break
        }
        case "down": {
            console.log(`\nMigrating Down: ${env.DATABASE_URL}\n`)
            const results = await migrator.migrateDown()
            await printMigrationResults(results)
            break
        }
        default:
            if (positionals[0]) console.error(`Unknown command: ${positionals[0]}`)
            showHelp()
            process.exit(1)
    }
}
