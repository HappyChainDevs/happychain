import { afterAll, beforeAll } from "bun:test"
import { anvil } from "./anvil"
import { contracts } from "./contracts"

beforeAll(async () => {
    /**
     * This works great for running the tests, however
     * it breaks when using --watch mode. To run watch mode successfully
     * you need to run anvil as a separate service and deploy the
     * contracts manually. Then use the `setup-migrations.ts` preload
     * script instead of this one.
     */

    await anvil.start()
    await contracts.deploy()
})

afterAll(async () => {
    await anvil.stop()
})
