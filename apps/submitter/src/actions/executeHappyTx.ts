import { BaseError } from "viem"
import { submitterClient } from "#src/clients"
import { PaymentRevertedError } from "#src/errors"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import type { HappyTxState, HappyTxStateSuccess } from "#src/tmp/interface/HappyTxState"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"
import { findExecutionAccount } from "#src/utils/findExecutionAccount"

export async function executeHappyTx({
    entryPoint,
    simulate,
    tx,
}: { entryPoint: `0x${string}`; tx: HappyTx; simulate: boolean }): Promise<HappyTxState> {
    try {
        const account = findExecutionAccount(tx)
        const encoded = encodeHappyTx(tx)

        const args = { address: entryPoint, args: [encoded], account } as const

        // if gas limits where manually set, we skip simulation
        const { request } = simulate ? await submitterClient.simulateSubmit({ ...args }) : { request: {} }

        const hash = await submitterClient.submit({
            ...request,
            ...args,
        })

        const receipt = await submitterClient.waitForSubmitReceipt({ hash, tx: encoded })

        return {
            status: receipt.status,
            included: Boolean(receipt.txReceipt.transactionHash),
            receipt,
            // TODO: shouldn't need casting here at all since
            // we can determine all possible HappyTxState possibilities
            // as unknown is due to 'receipt' being incompatible
        } as unknown as HappyTxStateSuccess
    } catch (err) {
        if (!(err instanceof BaseError) || !err.metaMessages?.length) {
            // unhandled...
            throw err
        }

        const [errorMessage, _revertData] = err.metaMessages
        // TODO: how better to handle this
        if (errorMessage === "Error: PaymentReverted(bytes revertData)") {
            const revertData = _revertData.trim().match(/\((0x[0-9a-fA-F]{64})\)/)?.[1] as `0x${string}` | undefined
            throw new PaymentRevertedError(revertData)
        }

        // TODO: other error messages

        throw err
    }
}
