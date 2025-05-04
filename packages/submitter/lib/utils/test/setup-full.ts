import { afterAll, beforeAll } from "bun:test"
import { migrator } from "#lib/database/utils/migrator"
import { anvil } from "#lib/utils/test/anvil"
import { contracts } from "#lib/utils/test/contracts"

// Force some common test environment variables
process.env.NODE_ENV = "test"
process.env.DATABASE_URL = ":memory:"

beforeAll(async () => {
    const { error } = await migrator.migrateToLatest()
    if (error) throw new Error("[Submitter] Failed to run test migrations", { cause: error })

    // This doesn't work with watch mode, use `make test.watch`
    // instead, which starts anvil and deploys the contracts separately.

    await anvil.start()
    await contracts.deploy()
})

afterAll(async () => {
    await anvil.stop()
})
