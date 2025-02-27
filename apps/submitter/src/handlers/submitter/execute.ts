import { happyReceiptService } from "#src/services"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import { EntryPointStatus } from "#src/tmp/interface/status"
import { type ExecuteOutput, ExecuteSuccess } from "#src/tmp/interface/submitter_execute"
import { SubmitSuccess } from "#src/tmp/interface/submitter_submit"
import { computeHappyTxHash } from "#src/utils/getHappyTxHash"
import { submit } from "./submit"

export async function execute(data: { entryPoint: `0x${string}`; tx: HappyTx }): Promise<ExecuteOutput> {
    const happyTxHash = computeHappyTxHash(data.tx)
    const status = await submit(data)

    if (status.status !== SubmitSuccess || !status.hash) {
        return status satisfies ExecuteOutput
    }

    const receipt = await happyReceiptService.findByHappyTxHashWithTimeout(happyTxHash, 60_000)
    if (!receipt || receipt.txReceipt.status !== "success") throw new Error("Unable to retrieve receipt")

    return {
        status: ExecuteSuccess,
        state: {
            status: EntryPointStatus.Success,
            included: true,
            receipt: receipt,
        },
    } satisfies ExecuteOutput
}
