import { beforeAll } from "bun:test"
import { migrator } from "#lib/database/utils/migrator"

// Force some common test environment variables
process.env.NODE_ENV = "test"
process.env.DATABASE_URL = ":memory:"

beforeAll(async () => {
    const { error } = await migrator.migrateToLatest()
    if (error) throw new Error("[Submitter] Failed to run test migrations", { cause: error })
})
