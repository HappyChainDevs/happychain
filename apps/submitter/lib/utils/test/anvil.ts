import { ifDef } from "@happy.tech/common"
import { type TestClient, createTestClient } from "viem"
import { env } from "#lib/env"
import { chain } from "#lib/services/clients"
import { transport } from "./helpers"

export const anvilClient: TestClient = createTestClient({ chain, transport, mode: "anvil" })

export const USING_ANVIL = true // for now, only Anvil is supported
const BLOCK_TIME = ifDef(process.env.ANVIL_BLOCK_TIME, Number) ?? 2

/**
 * Returns a function that runs the {@link f} with automine on.
 *
 * If not using Anvil, will skip the function if automine is off (not
 * that we really expect to automine without Anvil, but who knows).
 */
export function withAutomine(f: () => void | Promise<void>): () => Promise<void> {
    if (!USING_ANVIL)
        return async () => {
            if (!env.AUTOMINE_TESTS) console.log("Test skipped: needs automine on")
            else await f()
        }
    return async () => {
        if (!env.AUTOMINE_TESTS) await anvilClient.setIntervalMining({ interval: 0 })
        try {
            await f()
        } finally {
            if (!env.AUTOMINE_TESTS) await anvilClient.setIntervalMining({ interval: BLOCK_TIME })
        }
    }
}

/**
 * Returns a function that runs {@link f} with automine disabled and interval mining set to
 * mine blocks at intervals of {@links timeSeconds} if using Anvil, or the RPC's own interval
 * if {@link allowOwnInterval} is true.
 *
 * If not using Anvil, will skip if not interval mining, or if an exact
 * interval is required and is different from the RPC's own interval.
 *
 * Use a value of 0 to disable mining altogether.
 */
export function withInterval(
    timeSeconds: number,
    allowOwnInterval: boolean,
    f: () => void | Promise<void>,
): () => Promise<void> {
    if (!USING_ANVIL)
        return async () => {
            if (env.AUTOMINE_TESTS) {
                console.log("Test skipped: needs interval mining")
            } else if (allowOwnInterval) {
                console.log(`Test running with RPC's own interval of ${BLOCK_TIME} seconds`)
                await f()
            } else {
                console.log("Test skipped: requires exact interval which is different from this RPC's interval")
            }
        }
    return async () => {
        if (env.AUTOMINE_TESTS) await anvilClient.setAutomine(false)
        await anvilClient.setIntervalMining({ interval: timeSeconds })
        try {
            await f()
        } finally {
            if (env.AUTOMINE_TESTS) {
                await anvilClient.setIntervalMining({ interval: 0 })
                await anvilClient.setAutomine(true)
            } else {
                await anvilClient.setIntervalMining({ interval: BLOCK_TIME })
            }
        }
    }
}
