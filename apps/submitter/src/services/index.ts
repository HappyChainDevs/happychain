import { db } from "#src/database"
import { HappyReceiptRepository } from "#src/repositories/HappyReceiptRepository"
import { HappyStateRepository } from "#src/repositories/HappyStateRepository"
import { HappyTransactionRepository } from "#src/repositories/HappyTransactionRepository"
import { HappyReceiptService } from "./HappyReceiptService"
import { HappyStateService } from "./HappyStateService"
import { HappyTransactionService } from "./HappyTransactionService"
import { SubmitterService } from "./SubmitterService"

const happyStateRepository = new HappyStateRepository(db)
const happyTransactionRepository = new HappyTransactionRepository(db)
const happyReceiptRepository = new HappyReceiptRepository(db)

export const happyTransactionService = new HappyTransactionService(happyTransactionRepository)
const happyStateService = new HappyStateService(happyStateRepository)
export const happyReceiptService = new HappyReceiptService(happyReceiptRepository)

export const submitterService = new SubmitterService(happyTransactionService, happyStateService, happyReceiptService)
