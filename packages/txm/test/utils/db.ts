import { db } from "../../lib/db/driver"

export async function cleanDB() {
    const tables = await db
        // @ts-ignore
        .selectFrom("sqlite_schema")
        // @ts-ignore
        .where("type", "=", "table")
        // @ts-ignore
        .where("name", "not like", "sqlite_%")
        // @ts-ignore
        .select("name")
        .$castTo<{ name: string }>()
        .execute()

    for (const table of tables) {
        await db.schema.dropTable(table.name).execute()
    }
}
