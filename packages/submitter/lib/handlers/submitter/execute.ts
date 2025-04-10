import { type Result, err, ok } from "neverthrow"
import { getErrorNameFromSelector } from "#lib/errors/parsedCodes"
import { happyReceiptService } from "#lib/services"
import { EntryPointStatus, SubmitterErrorStatus } from "#lib/tmp/interface/status"
import { type ExecuteInput, type ExecuteOutput, ExecuteSuccess } from "#lib/tmp/interface/submitter_execute"
import { computeBoopHash } from "#lib/utils/computeBoopHash.ts"
import { submit } from "./submit"

export async function execute(data: ExecuteInput): Promise<Result<ExecuteOutput, ExecuteOutput>> {
    const happyTxHash = computeBoopHash(data.tx)
    const status = await submit(data)

    if (status.isErr()) {
        if ("simulation" in status.error && status.error.simulation) {
            return err({
                status: status.error.simulation.status || SubmitterErrorStatus.UnexpectedError,
                revertData:
                    getErrorNameFromSelector(status.error.simulation.revertData || "0x") ||
                    status.error.simulation.revertData,
            })
        }
        return err({ status: SubmitterErrorStatus.UnexpectedError })
    }

    const receipt = await happyReceiptService.findByHappyTxHashWithTimeout(happyTxHash, 60_000)

    if (!receipt || receipt.txReceipt.status !== "success") return err({ status: SubmitterErrorStatus.UnexpectedError })

    return ok({
        status: ExecuteSuccess,
        state: {
            status: EntryPointStatus.Success,
            included: true,
            receipt: receipt,
        },
    })
}
