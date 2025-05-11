import { deployment, env } from "#lib/env"
import { receiptService, simulationCache } from "#lib/services"
import { SubmitterError } from "#lib/types"
import { logger } from "#lib/utils/logger.ts"
import { WaitForReceipt, type WaitForReceiptInput, type WaitForReceiptOutput } from "./types"

export async function waitForReceipt(input: WaitForReceiptInput): Promise<WaitForReceiptOutput> {
    const { hash, timeout } = input
    const entryPoint = input.entryPoint ?? deployment.EntryPoint
    // TODO this needs a try-catch for proper error handling, and probably the services need to be more aware of their own errors

    logger.trace("Waiting for receipt (boop/receipt)", hash)
    const receipt = await receiptService.find(hash, timeout ?? env.RECEIPT_TIMEOUT)
    console.log("foobar got receipt", receipt)
    if (receipt) return { status: WaitForReceipt.Success, receipt }

    const simulation = await simulationCache.findSimulation(entryPoint, hash)
    if (simulation)
        return {
            status: SubmitterError.ReceiptTimeout,
            simulation,
            description: "Timed out while waiting for receipt.",
        }

    return { status: WaitForReceipt.UnknownBoop }
}
