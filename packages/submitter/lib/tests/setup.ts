import { afterAll, beforeAll } from "bun:test"
import "./env-bootstrap"
import { sleep } from "bun"
import { migrator } from "#lib/database/utils/migrator"
import { anvil } from "./utils/anvil"
import { contracts } from "./utils/contracts"

beforeAll(async () => {
    const { error } = await migrator.migrateToLatest()
    if (error) throw new Error("[Submitter] Failed to run test migrations", { cause: error })

    await anvil.start()
    await sleep(2_000)
    await contracts.deploy()
    await sleep(2_000)
})

afterAll(async () => {
    await anvil.stop()
})
