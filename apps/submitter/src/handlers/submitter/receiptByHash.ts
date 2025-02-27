import { happyReceiptService } from "#src/services"
import { StateRequestStatus } from "#src/tmp/interface/HappyTxState"
import { EntryPointStatus } from "#src/tmp/interface/status"

export async function receiptByHash({ hash, timeout }: { hash: `0x${string}`; timeout: number }) {
    const receipt = await happyReceiptService.findByHashWithTimeout(hash, timeout)
    if (!receipt) throw new Error("Failed to find receipt within timeout")

    // TODO: different responses based on receipt results
    // this assumes the happyPath was taken
    return {
        status: StateRequestStatus.Success,
        state: {
            status: EntryPointStatus.Success,
            included: true,
            simulation: undefined, // TODO:
            receipt: receipt,
        },
    }
}
