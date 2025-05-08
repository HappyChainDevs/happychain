import type { MigrationResultSet } from "kysely"

export async function printMigrationResults({ error, results }: MigrationResultSet) {
    if (results?.length) {
        for (const result of results) {
            console.log(`[${result.status}] ${result.direction} ${result.migrationName}`)
        }
    } else if (!error) {
        console.log("No migrations were run")
    }

    if (error) console.error(error)
}
