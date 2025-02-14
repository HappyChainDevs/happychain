import { submitterClient } from "#src/clients"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import type { HappyTxState, HappyTxStateSuccess } from "#src/tmp/interface/HappyTxState"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"
import { findExecutionAccount } from "./findExecutionAccount"

export async function executeHappyTx({
    entryPoint,
    tx,
}: { entryPoint: `0x${string}`; tx: HappyTx }): Promise<HappyTxState> {
    const hasGasLimitsSet = tx.executeGasLimit && tx.gasLimit && tx.maxFeePerGas && tx.submitterFee

    const usingPaymaster = tx.account !== tx.paymaster

    const account = findExecutionAccount(tx)

    // If using a paymaster, these values may be left as 0
    // and we will fill in here
    if (usingPaymaster && !hasGasLimitsSet) {
        const estimates = await submitterClient.estimateSubmitGas({
            address: entryPoint,
            args: [encodeHappyTx(tx)],
            account,
        })

        tx.executeGasLimit ||= estimates.executeGasLimit
        tx.gasLimit ||= estimates.gasLimit
        tx.maxFeePerGas ||= estimates.maxFeePerGas
        tx.submitterFee ||= estimates.submitterFee
    }

    const encoded = encodeHappyTx(tx)

    const args = { address: entryPoint, args: [encoded], account } as const

    // if gas limits where manually set, we skip simulation
    const { request } = hasGasLimitsSet ? { request: { ...args } } : await submitterClient.simulateSubmit({ ...args })

    const hash = await submitterClient.submit({
        ...request,
        value: undefined,
        account,
        args: request.args as [`0x${string}`],
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
}
