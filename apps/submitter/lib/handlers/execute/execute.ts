import { outputForGenericError } from "#lib/handlers/errors"
import { submitInternal } from "#lib/handlers/submit/submit"
import { WaitForReceipt } from "#lib/handlers/waitForReceipt"
import { Onchain } from "#lib/types"
import { computeHash } from "#lib/utils/boop/computeHash"
import { logger } from "#lib/utils/logger"
import type { ExecuteInput, ExecuteOutput } from "./types"

export async function execute(input: ExecuteInput): Promise<ExecuteOutput> {
    try {
        const boopHash = computeHash(input.boop)
        logger.trace("Executing boop", boopHash)
        const { txHash, receiptPromise, ...submission } = await submitInternal(input, false)
        if (submission.status !== Onchain.Success) return submission
        const waitOutput = await receiptPromise!
        return waitOutput.status === WaitForReceipt.Success
            ? waitOutput
            : ({ ...waitOutput, stage: "execute" } satisfies Omit<ExecuteOutput, "status"> as ExecuteOutput)
    } catch (error) {
        return { ...outputForGenericError(error), stage: "execute" }
    }
}
