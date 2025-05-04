import type { Hex } from "@happy.tech/common"
import { env } from "#lib/env"
import { outputForExecuteError, outputForRevertError } from "#lib/handlers/errors"
import { submit } from "#lib/handlers/submit/submit"
import { boopReceiptService } from "#lib/services"
import { computeBoopHash } from "#lib/services/computeBoopHash"
import { Onchain, type OnchainStatus } from "#lib/types"
import { SubmitterError } from "#lib/types"
import { logger } from "#lib/utils/logger"
import { decodeEvent, decodeRawError } from "#lib/utils/parsing"
import type { ExecuteInput, ExecuteOutput } from "./types"

export async function execute(data: ExecuteInput): Promise<ExecuteOutput> {
    const boopHash = computeBoopHash(env.CHAIN_ID, data.boop, { cache: true })
    const submission = await submit(data)

    if (submission.status !== Onchain.Success) return submission

    logger.trace("Waiting for receipt", boopHash)
    // TODO allow specifying a custom timeout
    const receipt = await boopReceiptService.findByBoopHashWithTimeout(boopHash, env.RECEIPT_TIMEOUT)

    if (!receipt)
        return {
            status: SubmitterError.ReceiptTimeout,
            stage: "execute",
            description:
                "Timed out while waiting for the boop receipt.\n" +
                "The boop may still be included onchain later if the timeout was low.",
        }

    if (receipt.txReceipt.status === "success") {
        // TODO this should be only the boop's receipts
        // TODO note misbehaviour
        // TODO check contract originating the revert!
        // EntryPoint.submit succeeded, but check that the execution actually succeeded.
        let output: ExecuteOutput | undefined
        for (const log of receipt.txReceipt.logs) {
            const decoded = decodeEvent(log)
            if (!decoded) continue
            const status = getEntryPointStatusFromEventName(decoded?.eventName)
            if (!status) continue
            output = {
                ...outputForExecuteError(status, decoded.args[0] as Hex),
                stage: "execute",
            }
            break
        }
        if (output) {
            logger.trace("Execute reverted onchain", boopHash)
            return output
        } else {
            logger.trace("Successfully executed", boopHash)
            return { status: Onchain.Success, receipt }
        }
    }

    const decoded = decodeRawError(receipt.revertData)
    const output = outputForRevertError(data.boop, boopHash, decoded)

    if (output.status === Onchain.UnexpectedReverted && receipt.txReceipt.gasUsed === BigInt(submission.gasLimit)) {
        if (data.boop.payer === data.boop.account) {
            logger.trace("Reverted onchain with out-of-gas for self-paying boop", boopHash)
            // TODO note account as problematic
        } else {
            logger.warn("Reverted onchain with out-of-gas for sponsored boop", boopHash)
        }
        return {
            status: Onchain.EntryPointOutOfGas,
            stage: "execute",
            receipt,
            description:
                "The boop was included onchain but ran out of gas. If the transaction is self-paying, " +
                "this can indicate a `payout` function that consumes more gas during execution than during simulation.",
        }
    }

    if (output.status === Onchain.UnexpectedReverted) {
        logger.warn("Execute failed onchain with an unexpected revert", boopHash, output)
    } else {
        logger.trace("Execute failed onchain", boopHash)
    }

    return { ...output, stage: "execute" }
}

function getEntryPointStatusFromEventName(eventName: string): OnchainStatus | undefined {
    switch (eventName) {
        case "CallReverted":
            return Onchain.CallReverted
        case "ExecutionRejected":
            return Onchain.ExecuteRejected
        case "ExecutionReverted":
            return Onchain.ExecuteReverted
    }
}
