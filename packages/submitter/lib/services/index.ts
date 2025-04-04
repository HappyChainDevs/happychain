import { db } from "#lib/database"
import { HappyReceiptRepository } from "#lib/database/repositories/HappyReceiptRepository"
import { HappyStateRepository } from "#lib/database/repositories/HappyStateRepository"
import { HappyTransactionRepository } from "#lib/database/repositories/HappyTransactionRepository"
import { BoopNonceManagerService } from "./BoopNonceManagerService"
import { HappyReceiptService } from "./HappyReceiptService"
import { HappySimulationService } from "./HappySimulationService"
import { HappyStateService } from "./HappyStateService"
import { HappyTransactionService } from "./HappyTransactionService"
import { SimulationCacheService } from "./SimulationCacheService"
import { SubmitterService } from "./SubmitterService"

//=== DB Repositories ==============================================================================
const happyStateRepository = new HappyStateRepository(db)
const happyTransactionRepository = new HappyTransactionRepository(db)
const happyReceiptRepository = new HappyReceiptRepository(db)
// const happySimulationRepository = new HappySimulationRepository(db)

//=== Services ==================================================================================
const happyTransactionService = new HappyTransactionService(happyTransactionRepository)
const happyStateService = new HappyStateService(happyStateRepository)
export const happyReceiptService = new HappyReceiptService(happyReceiptRepository)
export const simulationCacheService = new SimulationCacheService()
export const boopNonceManager = new BoopNonceManagerService()
export const happySimulationService = new HappySimulationService(simulationCacheService)
export const submitterService = new SubmitterService(happyTransactionService, happyStateService, happyReceiptService)
