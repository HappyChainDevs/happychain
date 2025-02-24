import { submitterClient } from "#src/clients"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import { type SubmitOutput, SubmitSuccess } from "#src/tmp/interface/submitter_submit"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"
import { findExecutionAccount } from "#src/utils/findExecutionAccount"

export async function submitHappyTx({
    entryPoint,
    simulate,
    tx,
}: { entryPoint: `0x${string}`; tx: HappyTx; simulate: boolean }): Promise<SubmitOutput> {
    const account = findExecutionAccount(tx)
    const encoded = encodeHappyTx(tx)

    const args = { address: entryPoint, args: [encoded], account } as const

    // if gas limits where manually set, we skip simulation
    const { request } = simulate ? await submitterClient.simulateSubmit({ ...args }) : { request: {} }

    const hash = await submitterClient.submit({
        ...request,
        ...args,
    })

    return {
        status: SubmitSuccess,
        hash,
    }
}
