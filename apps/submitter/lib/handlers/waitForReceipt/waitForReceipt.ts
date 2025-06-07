import { outputForGenericError } from "#lib/handlers/errors"
import { boopReceiptService } from "#lib/services"
import type { WaitForReceiptInput, WaitForReceiptOutput } from "./types"

export async function waitForReceipt(input: WaitForReceiptInput): Promise<WaitForReceiptOutput> {
    try {
        return await boopReceiptService.waitForInclusion({ boopHash: input.boopHash })
    } catch (error) {
        return outputForGenericError(error)
    }
}
