import { enqueueBuffer } from "#src/nonceQueueManager"
import { executeHappyTxQueueManager, submitterService } from "#src/services"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import { adjustPaymasterGasRates } from "#src/utils/adjustPaymasterGasRates"

export async function execute(data: { entryPoint: `0x${string}`; tx: HappyTx }) {
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
    const state = await enqueueBuffer(executeHappyTxQueueManager, {
        // buffer management
        nonceTrack: tx.nonceTrack,
        nonceValue: tx.nonceValue,
        account: tx.account,
        // additional data
        simulate,
        entryPoint: entryPoint,
        tx: tx,
    })

    // inserts final happyState+happyReceipt status
    await submitterService.finalize(persistedTx.id as number, state)

    return state
}
