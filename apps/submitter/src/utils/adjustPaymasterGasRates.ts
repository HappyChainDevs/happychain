import { submitterClient } from "#src/clients"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"
import { findExecutionAccount } from "./findExecutionAccount"

export async function adjustPaymasterGasRates({ entryPoint, tx }: { entryPoint: `0x${string}`; tx: HappyTx }) {
    const hasGasLimitsSet = Boolean(tx.executeGasLimit && tx.gasLimit && tx.maxFeePerGas && tx.submitterFee)
    const usingPaymaster = tx.account !== tx.paymaster
    const shouldSimulate = hasGasLimitsSet

    if (!usingPaymaster || hasGasLimitsSet) return { entryPoint, tx, simulate: shouldSimulate }

    const account = findExecutionAccount(tx)

    // If using a paymaster, these values may be left as 0
    // and we will fill in here
    const estimates = await submitterClient.estimateSubmitGas({
        address: entryPoint,
        args: [encodeHappyTx(tx)],
        account,
    })

    return {
        entryPoint,
        simulate: shouldSimulate,
        tx: {
            ...tx,
            executeGasLimit: tx.executeGasLimit || estimates.executeGasLimit,
            gasLimit: tx.gasLimit || estimates.gasLimit,
            maxFeePerGas: tx.maxFeePerGas || estimates.maxFeePerGas,
            submitterFee: tx.submitterFee || estimates.submitterFee,
        },
    }
}
