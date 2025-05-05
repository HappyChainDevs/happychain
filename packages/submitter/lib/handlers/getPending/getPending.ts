import { stringify } from "@happy.tech/common"
import { boopNonceManager } from "#lib/services"
import { SubmitterError } from "#lib/types"
import { GetPending, type GetPendingInput, type GetPendingOutput } from "./types"

export async function getPending({ account }: GetPendingInput): Promise<GetPendingOutput> {
    try {
        const pending = boopNonceManager.getBlockedBoops(account)
        return { status: GetPending.Success, account, pending }
    } catch (e) {
        // No known exceptions can be thrown.
        return {
            status: SubmitterError.UnexpectedError,
            description: stringify(e),
        }
    }
}
