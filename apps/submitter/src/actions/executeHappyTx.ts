import { publicClient, submitterClient } from "#src/clients"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"

export async function executeHappyTx({ entryPoint, tx }: { entryPoint: `0x${string}`; tx: HappyTx }) {
    const hasGasLimitsSet = tx.executeGasLimit && tx.gasLimit && tx.maxFeePerGas && tx.submitterFee

    const usingPaymaster = tx.account !== tx.paymaster

    // If using a paymaster, these values may be left as 0
    // and we will fill in here
    // TODO: submitter.estimateGas()
    if (usingPaymaster) {
        tx.executeGasLimit ||= 4000000000
        tx.gasLimit ||= 4000000000
        tx.maxFeePerGas ||= ((await publicClient.estimateMaxPriorityFeePerGas()) * 120n) / 100n
        tx.submitterFee ||= 100n
    }

    const encoded = encodeHappyTx(tx)
    const args = { address: entryPoint, args: [encoded] } as const

    // if gas limits where manually set, we skip simulation
    const { request } = hasGasLimitsSet ? { request: args } : await submitterClient.simulateSubmit(args)

    const hash = await submitterClient.submit(request)

    const receipt = await submitterClient.waitForSubmitReceipt({ hash, tx: encoded })

    return receipt
}
