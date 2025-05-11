import { join } from "node:path"
import { KyselyBunSqliteDialect, generate } from "kysely-codegen"
import { db } from "#lib/database"
import { overrides } from "#lib/database/typeGenOverrides"

/**
 * This generates all the typescript types definitions based on the current database state, and save
 * it to `lib/database/generated.d.ts`. It should be run after migrations are applied.
 *
 * Note: This file can't easily be built for production, but the type generation is also
 * not needed in production.
 */

const baseDir = join(import.meta.dir, "../../../")

const typeGenOutFile = "lib/database/generated.d.ts"

const typeCodeGenOptions = {
    camelCase: false,
    db,
    dialect: new KyselyBunSqliteDialect(),
    outFile: join(baseDir, typeGenOutFile),
    overrides,
    singular: true,
    verify: false,
}

export async function generateDatabaseTypesCommand() {
    await generate(typeCodeGenOptions)
    console.log(`\nSuccessfully Generated types: ${typeGenOutFile}`)
}
