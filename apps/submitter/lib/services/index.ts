import { db } from "#lib/database"
import { BoopNonceManager } from "./BoopNonceManager"
import { DatabaseService } from "./DatabaseService"
import { ReceiptService } from "./ReceiptService"
import { SimulationCache } from "./SimulationCache"

//=== Services ==================================================================================

export const dbService = new DatabaseService(db)
export const receiptService = new ReceiptService()
export const boopNonceManager = new BoopNonceManager()
export const simulationCache = new SimulationCache()

export type { WaitForInclusionArgs } from "./ReceiptService"
export { computeHash } from "../utils/boop/computeHash"
export { findExecutionAccount } from "./evmAccounts"
