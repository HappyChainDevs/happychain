import { getPendingTransactions } from "#lib/services/nonceManager"
import type { PendingHappyTxInput, PendingHappyTxOutput } from "#lib/tmp/interface/submitter_pending"

export async function pendingByAccount({ account }: PendingHappyTxInput): Promise<PendingHappyTxOutput> {
    // TODO: these are only submitted: false transactions.
    // we should also include submitted: true (but not yet included)
    const pending = getPendingTransactions(account)
    return { pending }
}
