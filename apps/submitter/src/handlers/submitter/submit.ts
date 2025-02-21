import { submitterClient } from "#src/clients"
import { incrementLocalNonce, isTxBlocked, waitUntilUnblocked } from "#src/services/nonceManager"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import { type SubmitOutput, SubmitSuccess } from "#src/tmp/interface/submitter_submit"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"
import { findExecutionAccount } from "#src/utils/findExecutionAccount"

export async function submit(data: { entryPoint: `0x${string}`; tx: HappyTx }): Promise<SubmitOutput> {
    const account = findExecutionAccount(data.tx)

    const simulate = await submitterClient.simulateSubmit({
        address: data.entryPoint,
        args: [encodeHappyTx(data.tx)],
        account,
    })

    if (await isTxBlocked(data.tx)) {
        await waitUntilUnblocked(data.tx)
        // TODO: re-simulate before execution?
        // simulate = await submitterClient.simulateSubmit({ address: data.entryPoint, args: [encodeHappyTx(data.tx)], account })
    }

    // use simulated result instead of the original tx as it may have updated gas values
    const hash = await submitterClient.submit(simulate.request)

    // Increment the localNonce so the next tx can be executed (if available)
    incrementLocalNonce(data.tx)

    return {
        status: SubmitSuccess,
        hash,
    }
}
