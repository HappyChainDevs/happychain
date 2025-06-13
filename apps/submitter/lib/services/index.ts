import type { Hash } from "@happy.tech/common"
import { db } from "#lib/database"
import { env } from "#lib/env"
import type { SimulateOutput } from "#lib/handlers/simulate"
import { EvmReceiptService } from "#lib/services/EvmReceiptService"
import { LruCache } from "#lib/utils/LruCache"
import { BlockService } from "./BlockService"
import { BoopNonceManager } from "./BoopNonceManager"
import { BoopReceiptService } from "./BoopReceiptService"
import { BoopStore } from "./BoopStore"
import { DatabaseService } from "./DatabaseService"

//=== Services ==================================================================================

export const dbService = new DatabaseService(db)

export const boopNonceManager = new BoopNonceManager()
export const boopStore = new BoopStore()
export const simulationCache = new LruCache<Hash, SimulateOutput>({
    max: env.SIMULATION_CACHE_SIZE,
    maxAge: env.SIMULATION_CACHE_TTL,
})
export const blockService = new BlockService()
export const evmReceiptService = new EvmReceiptService(blockService)
export const boopReceiptService = new BoopReceiptService(evmReceiptService)

export type { WaitForInclusionArgs } from "./BoopReceiptService"
export { computeHash } from "../utils/boop/computeHash"
export { findExecutionAccount, evmNonceManager } from "./evmAccounts"
export { resyncAccount, resyncAllAccounts } from "./resync"
export { replaceTransaction } from "./replaceTransaction"
