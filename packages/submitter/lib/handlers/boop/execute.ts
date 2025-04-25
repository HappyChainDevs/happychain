import { type Result, err, ok } from "neverthrow"
import { env } from "#lib/env"
import { getErrorNameFromSelector } from "#lib/errors/parsedCodes"
import { type ExecuteInput, type ExecuteOutput, ExecuteSuccess } from "#lib/interfaces/boop_execute"
import { EntryPointStatus, SubmitterErrorStatus } from "#lib/interfaces/status"
import { boopReceiptService } from "#lib/services"
import { computeBoopHash } from "#lib/utils/computeBoopHash"
import { submit } from "./submit"

export async function execute(data: ExecuteInput): Promise<Result<ExecuteOutput, ExecuteOutput>> {
    const boopHash = computeBoopHash(BigInt(env.CHAIN_ID), data.tx)
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
        if ("status" in status.error && "revertData" in status.error) {
            return err({ status: status.error.status, revertData: status.error.revertData } as ExecuteOutput)
        }

        return err({ status: SubmitterErrorStatus.UnexpectedError })
    }

    const receipt = await boopReceiptService.findByBoopHashWithTimeout(boopHash, 10_000)

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
