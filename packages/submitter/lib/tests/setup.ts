import { afterAll, beforeAll } from "bun:test"
import "./env-bootstrap"
import { migrator } from "#lib/database/utils/migrator"
import { anvil } from "./utils/anvil"
import { contracts } from "./utils/contracts"

// TODO temp
beforeAll(async () => {
    const { error } = await migrator.migrateToLatest()
    if (error) throw new Error("[Submitter] Failed to run test migrations", { cause: error })

    /**
     * This works great for running the tests, however
     * it breaks when using --watch mode. to run watch mode successfully
     * you need to run anvil as a separate service and deploy the
     * contracts manually.
     */

    await anvil.start()
    await contracts.deploy()
})

afterAll(async () => {
    await anvil.stop()
})
