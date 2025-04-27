import { type Hex, getProp, hasDefinedKey } from "@happy.tech/common"
import { type Result, err, ok } from "neverthrow"
import { env } from "#lib/env"
import { getErrorNameFromSelector } from "#lib/errors/viem"
import { EXECUTE_SUCCESS, type ExecuteInput, type ExecuteOutput } from "#lib/interfaces/boop_execute"
import { EntryPointStatus, SubmitterErrorStatus } from "#lib/interfaces/status"
import { boopReceiptService } from "#lib/services"
import { computeBoopHash } from "#lib/utils/computeBoopHash"
import { submit } from "./submit"

export async function execute(data: ExecuteInput): Promise<Result<ExecuteOutput, ExecuteOutput>> {
    const boopHash = computeBoopHash(BigInt(env.CHAIN_ID), data.boop)
    const status = await submit(data)

    if (status.isErr()) {
        if (hasDefinedKey(status.error, "simulation")) {
            return err({
                // TODO totally hacked this whole thing for it to compile
                status:
                    (getProp(status.error.simulation, "status") as SubmitterErrorStatus.UnexpectedError) ||
                    SubmitterErrorStatus.UnexpectedError,
                revertData:
                    getErrorNameFromSelector((getProp(status.error.simulation, "revertData") as Hex) || "0x") ||
                    (getProp(status.error.simulation, "revertData") as Hex),
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
