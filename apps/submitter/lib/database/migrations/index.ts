import * as fs from "node:fs"
import * as path from "node:path"
import type { Migration } from "kysely"

const migrationFiles = fs
    .readdirSync(__dirname)
    .filter((file) => file !== "index.ts" && file.endsWith(".ts"))
    .sort()

export const migrations: Record<string, Migration> = {}

for (const file of migrationFiles) {
    const fileName = path.basename(file, ".ts")
    migrations[fileName] = await import(`./${file}`)
}
