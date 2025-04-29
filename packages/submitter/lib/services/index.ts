import { db } from "#lib/database"
import { BoopReceiptRepository } from "#lib/database/repositories/BoopReceiptRepository"
import { BoopStateRepository } from "#lib/database/repositories/BoopStateRepository"
import { BoopTransactionRepository } from "#lib/database/repositories/BoopTransactionRepository"
import { BoopNonceManagerService } from "./BoopNonceManagerService"
import { BoopReceiptService } from "./BoopReceiptService"
import { BoopStateService } from "./BoopStateService"
import { BoopTransactionService } from "./BoopTransactionService"
import { SimulationCache } from "./SimulationCache"
import { SubmitterService } from "./SubmitterService"

//=== Repositories ==============================================================================

const boopStateRepository = new BoopStateRepository(db)
const boopTransactionRepository = new BoopTransactionRepository(db)
const boopReceiptRepository = new BoopReceiptRepository(db)

//=== Services ==================================================================================

const boopTransactionService = new BoopTransactionService(boopTransactionRepository)
const boopStateService = new BoopStateService(boopStateRepository)
export const boopReceiptService = new BoopReceiptService(boopReceiptRepository)
export const boopNonceManager = new BoopNonceManagerService()
export const simulationCache = new SimulationCache()
export const submitterService = new SubmitterService(boopTransactionService, boopStateService, boopReceiptService)

export { computeBoopHash } from "./computeBoopHash"
export { findExecutionAccount } from "./evmAccounts"
