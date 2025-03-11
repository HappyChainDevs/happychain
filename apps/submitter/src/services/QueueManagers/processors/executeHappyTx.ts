import { submitterClient } from "#src/clients"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import type { HappyTxReceipt } from "#src/tmp/interface/HappyTxReceipt"
import type { SimulationResult } from "#src/tmp/interface/SimulationResult"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"
import { findExecutionAccount } from "#src/utils/findExecutionAccount"
import { computeHappyTxHash } from "#src/utils/getHappyTxHash"

export async function executeHappyTx({
    entryPoint,
    simulate,
    tx,
}: { entryPoint: `0x${string}`; tx: HappyTx; simulate: boolean }): Promise<{
    receipt: HappyTxReceipt
    simulation?: SimulationResult | undefined
}> {
    const account = findExecutionAccount(tx)
    const encoded = encodeHappyTx(tx)
    const happyTxHash = computeHappyTxHash(tx)
    const args = { address: entryPoint, args: [encoded], account } as const

    // if gas limits where manually set, we skip simulation
    const { request, simulation } = simulate //
        ? await submitterClient.simulateSubmit({ ...args })
        : { request: { ...args } }

    const hash = await submitterClient.submit({ ...request })

    const receipt = await submitterClient.waitForSubmitReceipt({ txHash: hash, happyTx: tx, happyTxHash })
    return { receipt, simulation }
}
