import { type Result, ok } from "neverthrow"
import type { PendingBoopInput, PendingBoopOutput } from "#lib/handlers/getPending"
import { boopNonceManager } from "#lib/services"

export async function getPending({ account }: PendingBoopInput): Promise<Result<PendingBoopOutput, PendingBoopOutput>> {
    const pending = boopNonceManager.getBlockedBoops(account)
    return ok({ pending })
}
