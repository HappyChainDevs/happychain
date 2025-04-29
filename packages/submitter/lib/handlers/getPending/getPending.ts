import { type Result, ok } from "neverthrow"
import type { PendingBoopInput, PendingBoopOutput } from "#lib/interfaces/boop_pending"
import { boopNonceManager } from "#lib/services/index"

export async function pendingByAccount({
    account,
}: PendingBoopInput): Promise<Result<PendingBoopOutput, PendingBoopOutput>> {
    const pending = boopNonceManager.getBlockedBoops(account)
    return ok({ pending })
}
