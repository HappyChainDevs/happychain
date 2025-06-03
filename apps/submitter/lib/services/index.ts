import { db } from "#lib/database"
import { BlockService } from "./BlockService"
import { BoopNonceManager } from "./BoopNonceManager"
import { BoopReceiptService } from "./BoopReceiptService"
import { BoopStore } from "./BoopStore"
import { DatabaseService } from "./DatabaseService"
import { SimulationCache } from "./SimulationCache"

//=== Services ==================================================================================

export const dbService = new DatabaseService(db)
export const receiptService = new BoopReceiptService(BlockService.instance)
export const boopNonceManager = new BoopNonceManager()
export const simulationCache = new SimulationCache()
export const boopStore = new BoopStore()

export type { WaitForInclusionArgs } from "./BoopReceiptService"
export { computeHash } from "../utils/boop/computeHash"
export { findExecutionAccount } from "./evmAccounts"
