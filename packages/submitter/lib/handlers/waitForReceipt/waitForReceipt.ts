import { env } from "#lib/env"
import { boopReceiptService, simulationCache } from "#lib/services"
import { SubmitterError } from "#lib/types"
import { WaitForReceipt, type WaitForReceiptInput, type WaitForReceiptOutput } from "./types"

export async function waitForReceipt({ hash, timeout }: WaitForReceiptInput): Promise<WaitForReceiptOutput> {
    // TODO this needs a try-catch for proper error handling, and probably the services need to be more aware of their own errors

    const receipt = await boopReceiptService.find(hash, timeout ?? env.RECEIPT_TIMEOUT)
    if (receipt) return { status: WaitForReceipt.Success, receipt }

    const simulation = await simulationCache.findSimulation(hash)
    if (simulation)
        return {
            status: SubmitterError.ReceiptTimeout,
            simulation,
            description: "Timed out while waiting for receipt.",
        }

    return { status: WaitForReceipt.UnknownBoop }
}
