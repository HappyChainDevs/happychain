import { outputForGenericError } from "#lib/handlers/errors"
import { boopReceiptService } from "#lib/services"
import { traceFunction } from "#lib/telemetry/traces.ts"

import type { WaitForReceiptInput, WaitForReceiptOutput } from "./types"

async function waitForReceipt(input: WaitForReceiptInput): Promise<WaitForReceiptOutput> {
    try {
        return await boopReceiptService.waitForInclusion({ boopHash: input.boopHash })
    } catch (error) {
        return outputForGenericError(error)
    }
}

const tracedWaitForReceipt = traceFunction(waitForReceipt)

export { tracedWaitForReceipt as waitForReceipt }
