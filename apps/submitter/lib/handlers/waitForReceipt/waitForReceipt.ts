import { outputForGenericError } from "#lib/handlers/errors"
import { receiptService } from "#lib/services"
import type { WaitForReceiptInput, WaitForReceiptOutput } from "./types"

export async function waitForReceipt(input: WaitForReceiptInput): Promise<WaitForReceiptOutput> {
    try {
        return await receiptService.waitForInclusion({ boopHash: input.boopHash })
    } catch (error) {
        return outputForGenericError(error)
    }
}
