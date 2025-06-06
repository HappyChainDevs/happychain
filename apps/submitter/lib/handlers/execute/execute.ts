import { trace } from "@opentelemetry/api"
import { outputForGenericError } from "#lib/handlers/errors"
import { submitInternal } from "#lib/handlers/submit/submit"
import { WaitForReceipt } from "#lib/handlers/waitForReceipt"
import { boopStore } from "#lib/services"
import { traceFunction } from "#lib/telemetry/traces"
import { Onchain } from "#lib/types"
import { computeHash } from "#lib/utils/boop/computeHash"
import { logger } from "#lib/utils/logger"
import type { ExecuteError, ExecuteInput, ExecuteOutput } from "./types"

async function execute(input: ExecuteInput): Promise<ExecuteOutput> {
    // Note: we only delete the boop from the boopStore on error cases, as `execute` can complete
    // with a timeout, in which case we might still need the boop internally for retries. It will
    // be deleted by the BoopReceiptService when we get the receipt or successfully cancel the boop.
    try {
        const boopHash = computeHash(input.boop)
        const activeSpan = trace.getActiveSpan()
        activeSpan?.setAttribute("boopHash", boopHash)
        logger.trace("Executing boop", boopHash)
        const { evmTxHash, receiptPromise, ...submission } = await submitInternal(input)
        if (submission.status !== Onchain.Success) {
            boopStore.delete(input.boop)
            return submission
        }
        const waitOutput = await receiptPromise!
        if (waitOutput.status === WaitForReceipt.Success) return waitOutput
        boopStore.delete(input.boop)
        return { ...waitOutput, stage: "execute" } satisfies Omit<ExecuteError, "status"> as ExecuteError
    } catch (error) {
        boopStore.delete(input.boop)
        return { ...outputForGenericError(error), stage: "execute" }
    }
}

const tracedExecute = traceFunction(execute, "execute")

export { tracedExecute as execute }
