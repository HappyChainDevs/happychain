import { outputForGenericError } from "#lib/handlers/errors"
import { boopNonceManager, boopStore, computeHash } from "#lib/services"
import { GetPending, type GetPendingInput, type GetPendingOutput } from "./types"

export async function getPending({ account }: GetPendingInput): Promise<GetPendingOutput> {
    try {
        const pending = boopStore.getByAccount(account).map((boop) => ({
            boopHash: computeHash(boop),
            nonceTrack: boop.nonceTrack,
            nonceValue: boop.nonceValue,
            // If the boop isn't blocked but is in the store, it must have been submitted (or it is about to be).
            submitted: !boopNonceManager.has(boop),
        }))
        return { status: GetPending.Success, account, pending }
    } catch (error) {
        return outputForGenericError(error)
    }
}
