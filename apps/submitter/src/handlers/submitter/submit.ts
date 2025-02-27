import { submitterClient } from "#src/clients"
import { enqueueBuffer } from "#src/nonceQueueManager"
import { submitHappyTxQueueManager, submitterService } from "#src/services"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import type { HappyTxStateSuccess } from "#src/tmp/interface/HappyTxState"
import { adjustPaymasterGasRates } from "#src/utils/adjustPaymasterGasRates"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"

export async function submit(data: { entryPoint: `0x${string}`; tx: HappyTx }) {
    // Adjust tx if needed
    // TODO: this was extracted from 'executeHappyTx' so that i can compute the complete happyTxHash
    // before enqueuing into the buffer. However this may be a mistake as maybe we can't properly
    // estimate the gas if the nonce is out of order/not ready yet?
    // If we move this back into the 'executeHappyTx' call, then we can't store the happyTx by hash
    // beforehand like this. do we want to exclude gas values from the happyTxHash calculation, or..?
    const { entryPoint, tx, simulate } = await adjustPaymasterGasRates(data)

    // persists raw happyTransaction
    const persistedTx = await submitterService.initialize(entryPoint, tx)

    // Enqueue to be processed sequentially (by nonce/nonce track)
    const state = await enqueueBuffer(submitHappyTxQueueManager, {
        // buffer management
        nonceTrack: tx.nonceTrack,
        nonceValue: tx.nonceValue,
        account: tx.account,
        // additional data
        simulate,
        entryPoint: entryPoint,
        tx: tx,
    })

    if (!state.hash) throw new Error("Something Went Wrong")

    // save when finished, don't wait here
    submitterClient.waitForSubmitReceipt({ hash: state.hash, tx: encodeHappyTx(tx) }).then((receipt) =>
        submitterService.finalize(
            persistedTx.id as number,
            {
                status: receipt.status,
                included: Boolean(receipt.txReceipt.transactionHash),
                receipt,
            } as unknown as HappyTxStateSuccess,
        ),
    )

    return state
}
