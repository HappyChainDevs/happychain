import fs from "node:fs/promises"
import path, { join } from "node:path"
import { FileMigrationProvider, type MigrationResultSet, Migrator } from "kysely"
import { KyselyBunSqliteDialect, generate } from "kysely-codegen"
import { z } from "zod"
import { db } from "#lib/database"
import { overrides } from "#lib/database/type-generation-overrides"
import env from "#lib/env"
import { type getCommand, showHelp } from "../utils"

const baseDir = join(import.meta.dir, "../../../")

const typeGenOutFile = "lib/database/generated.d"
const typeCodeGenOptions = {
    camelCase: false,
    db,
    dialect: new KyselyBunSqliteDialect(),
    // logger: new Logger(),
    outFile: join(baseDir, typeGenOutFile),
    overrides,
    singular: true,
    verify: false,
}

export async function migrateCommand({ positionals }: ReturnType<typeof getCommand>) {
    const migrationFolder = join(baseDir, "./migrations")
    const provider = new FileMigrationProvider({ fs, path, migrationFolder })
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
        await generate(typeCodeGenOptions)
        console.log(`\nSuccessfully Generated types: ${typeGenOutFile}`)
    } else if (!error) {
        console.log("No migrations were run")
    }

    if (error) console.error(error)
}
