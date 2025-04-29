import { env } from "#lib/env"
import { submit } from "#lib/handlers/submit/submit"
import { boopReceiptService } from "#lib/services"
import { computeBoopHash } from "#lib/services/computeBoopHash"
import { Onchain } from "#lib/types"
import { SubmitterError } from "#lib/types"
import { logger } from "#lib/utils/logger"
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
        // TODO parse logs to ascertain that the boop actually succeeded — the tx can succeed with a failed call
        // TODO make sure we haven't been griefed ... and take note
        logger.trace("Successfully executed", boopHash)
        return { status: Onchain.Success, receipt }
    }

    // TODO what can we even gather from a failed receipt? I think we might be able to tell OOG vs non-OOG
    // TODO provide a boop-sdk functiont that performs self simulation, and that can be automatically attempted to gather data on the client-side
    logger.trace("Reverted onchain", boopHash)
    return {
        status: Onchain.UnexpectedReverted,
        stage: "execute",
        receipt,
        description:
            "The boop was included onchain but reverted there.\n" +
            "It previously passed simulation. It happens sometimes :')",
    }
}
