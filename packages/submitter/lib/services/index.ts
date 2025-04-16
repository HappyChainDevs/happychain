import { db } from "#lib/database"
import { BoopReceiptRepository } from "#lib/database/repositories/BoopReceiptRepository"
import { BoopStateRepository } from "#lib/database/repositories/BoopStateRepository"
import { BoopTransactionRepository } from "#lib/database/repositories/BoopTransactionRepository"
import { BoopNonceManagerService } from "./BoopNonceManagerService"
import { BoopReceiptService } from "./BoopReceiptService"
import { BoopSimulationService } from "./BoopSimulationService"
import { BoopStateService } from "./BoopStateService"
import { BoopTransactionService } from "./BoopTransactionService"
import { SimulationCacheService } from "./SimulationCacheService"
import { SubmitterService } from "./SubmitterService"

//=== Repositories ==============================================================================
const boopStateRepository = new BoopStateRepository(db)
const boopTransactionRepository = new BoopTransactionRepository(db)
const boopReceiptRepository = new BoopReceiptRepository(db)
const simulationCacheService = new SimulationCacheService()

//=== Services ==================================================================================
const boopTransactionService = new BoopTransactionService(boopTransactionRepository)
const boopStateService = new BoopStateService(boopStateRepository)
export const boopReceiptService = new BoopReceiptService(boopReceiptRepository)

export const boopNonceManager = new BoopNonceManagerService()
export const boopSimulationService = new BoopSimulationService(simulationCacheService)
export const submitterService = new SubmitterService(boopTransactionService, boopStateService, boopReceiptService)
