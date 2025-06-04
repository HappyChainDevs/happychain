import type { Hash } from "@happy.tech/common"
import { db } from "#lib/database"
import { env } from "#lib/env"
import type { SimulateOutput } from "#lib/handlers/simulate"
import { LruCache } from "#lib/utils/LruCache"
import { BlockService } from "./BlockService"
import { BoopNonceManager } from "./BoopNonceManager"
import { BoopReceiptService } from "./BoopReceiptService"
import { BoopStore } from "./BoopStore"
import { DatabaseService } from "./DatabaseService"

//=== Services ==================================================================================

export const dbService = new DatabaseService(db)
export const receiptService = new BoopReceiptService(BlockService.instance)
export const boopNonceManager = new BoopNonceManager()
export const boopStore = new BoopStore()
export const simulationCache = new LruCache<Hash, SimulateOutput>({
    max: env.SIMULATION_CACHE_SIZE,
    maxAge: env.SIMULATION_CACHE_TTL,
})

export type { WaitForInclusionArgs } from "./BoopReceiptService"
export { computeHash } from "../utils/boop/computeHash"
export { findExecutionAccount, evmNonceManager } from "./evmAccounts"
