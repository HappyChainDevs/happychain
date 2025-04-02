import { type Result, ok } from "neverthrow"
import { getPendingTransactions } from "#lib/services/nonceManager"
import type { PendingHappyTxInput, PendingHappyTxOutput } from "#lib/tmp/interface/submitter_pending"

export async function pendingByAccount({
    account,
}: PendingHappyTxInput): Promise<Result<PendingHappyTxOutput, PendingHappyTxOutput>> {
    const pending = getPendingTransactions(account)
    return ok({ pending })
}
