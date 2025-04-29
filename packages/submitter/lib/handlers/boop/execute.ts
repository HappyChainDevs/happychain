import { type BigIntSerialized, serializeBigInt } from "@happy.tech/common"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { env } from "#lib/env"
import { Onchain } from "#lib/interfaces/Onchain"
import { SubmitterError } from "#lib/interfaces/SubmitterError"
import type { ExecuteInput, ExecuteOutput } from "#lib/interfaces/boop_execute"
import { logger } from "#lib/logger"
import { boopReceiptService } from "#lib/services"
import { computeBoopHash } from "#lib/utils/computeBoopHash"
import { submit } from "./submit"

export async function executeFromRoute(
    input: ExecuteInput,
): Promise<[BigIntSerialized<ExecuteOutput>, ContentfulStatusCode]> {
    const output = await execute(input)
    // TODO do better, maybe other successful statuses, better http codes
    return output.status === Onchain.Success
        ? ([serializeBigInt(output), 200] as const)
        : ([serializeBigInt(output), 422] as const)
}

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
