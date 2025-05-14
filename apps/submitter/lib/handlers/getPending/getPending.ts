import { outputForGenericError } from "#lib/handlers/errors"
import { boopNonceManager } from "#lib/services"
import { GetPending, type GetPendingInput, type GetPendingOutput } from "./types"

export async function getPending({ account }: GetPendingInput): Promise<GetPendingOutput> {
    try {
        const pending = boopNonceManager.getBlockedBoops(account)
        return { status: GetPending.Success, account, pending }
    } catch (error) {
        return outputForGenericError(error)
    }
}
