import { submitterClient } from "#lib/clients"
import { submitterService } from "#lib/services"
import { incrementLocalNonce, isTxBlocked, waitUntilUnblocked } from "#lib/services/nonceManager"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import { EntryPointStatus } from "#lib/tmp/interface/status"
import { type SubmitOutput, SubmitSuccess } from "#lib/tmp/interface/submitter_submit"
import { encodeHappyTx } from "#lib/utils/encodeHappyTx"
import { findExecutionAccount } from "#lib/utils/findExecutionAccount"

export async function submit(data: { entryPoint: `0x${string}`; tx: HappyTx }): Promise<SubmitOutput> {
    // Save original tx to the database for historic purposes and data recovery
    await submitterService.initialize(data.entryPoint, data.tx)

    const account = findExecutionAccount(data.tx)

    const simulate = await submitterClient.simulateSubmit({
        address: data.entryPoint,
        args: [encodeHappyTx(data.tx)],
        account,
    })

    if (simulate.simulation?.status !== EntryPointStatus.Success) {
        throw new Error("Simulation failed") // TODO: more information as to what failed
    }

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
