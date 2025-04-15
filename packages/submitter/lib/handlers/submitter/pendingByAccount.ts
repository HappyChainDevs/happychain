import { type Result, ok } from "neverthrow"
import { boopNonceManager } from "#lib/services/index"
import type { PendingHappyTxInput, PendingHappyTxOutput } from "#lib/tmp/interface/submitter_pending"

export async function pendingByAccount({
    account,
}: PendingHappyTxInput): Promise<Result<PendingHappyTxOutput, PendingHappyTxOutput>> {
    const pending = boopNonceManager.getBlockedBoops(account)
    return ok({ pending })
}
