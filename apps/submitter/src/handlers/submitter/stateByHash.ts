import { happyReceiptService } from "#src/services"
import { StateRequestStatus } from "#src/tmp/interface/HappyTxState"
import { EntryPointStatus } from "#src/tmp/interface/status"

export async function stateByHash({ hash }: { hash: `0x${string}` }) {
    const receipt = await happyReceiptService.findByHashOrThrow(hash)

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
