import { submitterClient } from "#src/clients"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import type { Address } from "#src/tmp/interface/common_chain"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"
import { findExecutionAccount } from "./findExecutionAccount"

interface AdjustedTx {
    /** Entrypoint for the TX to be executed against */
    entryPoint: Address
    /** Whether the TX requires simulation before submitting */
    simulate: boolean
    /** The (potentially) adjusted HappyTx */
    tx: HappyTx
}

export async function adjustPaymasterGasRates({
    entryPoint,
    tx,
}: { entryPoint: `0x${string}`; tx: HappyTx }): Promise<AdjustedTx> {
    const hasGasLimitsSet = Boolean(tx.executeGasLimit && tx.gasLimit && tx.maxFeePerGas && tx.submitterFee)
    const usingPaymaster = tx.account !== tx.paymaster

    if (!usingPaymaster && !hasGasLimitsSet) throw new Error("When self paying, gas limits must be set")

    // If the gas limits are provided, the submitter is free to perform or not perform simulation before submitting.
    if (hasGasLimitsSet) return { entryPoint, tx, simulate: false }

    // If using a paymaster, these values may be left as 0 and we will need to fill in here.
    // if not using a paymaster, these values must be set, and we will return early (above)
    const estimates = await submitterClient.estimateSubmitGas({
        address: entryPoint,
        args: [encodeHappyTx(tx)],
        account: findExecutionAccount(tx),
    })

    return {
        entryPoint,
        // we have estimated gas values so simulation is required
        simulate: true,
        tx: {
            ...tx,
            executeGasLimit: tx.executeGasLimit || estimates.executeGasLimit,
            gasLimit: tx.gasLimit || estimates.gasLimit,
            maxFeePerGas: tx.maxFeePerGas || estimates.maxFeePerGas,
            submitterFee: tx.submitterFee || estimates.submitterFee,
        },
    }
}
