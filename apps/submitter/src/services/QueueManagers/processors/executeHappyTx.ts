import { keccak256 } from "viem"
import { submitterClient } from "#src/clients"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import type { HappyTxState, HappyTxStateSuccess } from "#src/tmp/interface/HappyTxState"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"
import { findExecutionAccount } from "#src/utils/findExecutionAccount"

export async function executeHappyTx({
    entryPoint,
    simulate,
    tx,
}: { entryPoint: `0x${string}`; tx: HappyTx; simulate: boolean }): Promise<HappyTxState> {
    const account = findExecutionAccount(tx)
    const encoded = encodeHappyTx(tx)
    const happyTxHash = keccak256(encoded)

    const args = { address: entryPoint, args: [encoded], account } as const

    // if gas limits where manually set, we skip simulation
    const { request } = simulate ? await submitterClient.simulateSubmit({ ...args }) : { request: {} }

    const hash = await submitterClient.submit({
        ...request,
        ...args,
    })

    const receipt = await submitterClient.waitForSubmitReceipt({ txHash: hash, happyTx: tx, happyTxHash })

    return {
        status: receipt.status,
        included: Boolean(receipt.txReceipt.transactionHash),
        receipt,
        // TODO: shouldn't need casting here at all since
        // we can determine all possible HappyTxState possibilities
        // as unknown is due to 'receipt' being incompatible
    } as unknown as HappyTxStateSuccess
}
