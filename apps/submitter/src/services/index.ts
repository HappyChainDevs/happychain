import { db } from "#src/database"
import { HappyReceiptRepository } from "#src/database/repositories/HappyReceiptRepository"
import { HappySimulationRepository } from "#src/database/repositories/HappySimulationRepository"
import { HappyStateRepository } from "#src/database/repositories/HappyStateRepository"
import { HappyTransactionRepository } from "#src/database/repositories/HappyTransactionRepository"
import { HappyReceiptService } from "./HappyReceiptService"
import { HappySimulationService } from "./HappySimulationService"
import { HappyStateService } from "./HappyStateService"
import { HappyTransactionService } from "./HappyTransactionService"
import { SubmitterService } from "./SubmitterService"

const happyStateRepository = new HappyStateRepository(db)
const happyTransactionRepository = new HappyTransactionRepository(db)
const happyReceiptRepository = new HappyReceiptRepository(db)
const happySimulationRepository = new HappySimulationRepository(db)

export const happyTransactionService = new HappyTransactionService(happyTransactionRepository)
const happyStateService = new HappyStateService(happyStateRepository)
export const happyReceiptService = new HappyReceiptService(happyReceiptRepository)
export const happySimulationService = new HappySimulationService(happySimulationRepository)

export const submitterService = new SubmitterService(
    happyTransactionService,
    happyStateService,
    happyReceiptService,
    happySimulationService,
)
