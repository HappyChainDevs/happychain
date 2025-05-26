import { outputForGenericError } from "#lib/handlers/errors"
import { boopNonceManager, receiptService } from "#lib/services"
import { GetPending, type GetPendingInput, type GetPendingOutput } from "./types"

export async function getPending({ account }: GetPendingInput): Promise<GetPendingOutput> {
    try {
        const blocked = boopNonceManager.getPendingBoops(account)
        const pending = receiptService.getPendingBoops(account)
      
        // now merge and sort by ascending nonceTrack and nonceValue
        const allPending = [...blocked, ...pending].sort((a, b) => {
            if (a.nonceTrack < b.nonceTrack) {
                return -1;
            }
            if (a.nonceTrack > b.nonceTrack) {
                return 1;
            }
            // nonceTrack is equal, so compare by nonceValue
            if (a.nonceValue < b.nonceValue) {
                return -1;
            }
            if (a.nonceValue > b.nonceValue) {
                return 1;
            }
            return 0; // Both nonceTrack and nonceValue are equal
        });

        return { status: GetPending.Success, account, pending: allPending }
    } catch (error) {
        return outputForGenericError(error)
    }
}
