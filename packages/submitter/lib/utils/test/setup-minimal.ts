import { beforeAll } from "bun:test"
import "./env-bootstrap"
import { migrator } from "#lib/database/utils/migrator"

beforeAll(async () => {
    const { error } = await migrator.migrateToLatest()
    if (error) throw new Error("[Submitter] Failed to run test migrations", { cause: error })
})
