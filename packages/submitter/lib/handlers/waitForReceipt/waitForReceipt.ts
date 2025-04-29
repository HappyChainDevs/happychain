import { type Result, err, ok } from "neverthrow"
import { env } from "#lib/env"
import { type StateRequestOutput, StateRequestStatus } from "#lib/handlers/getState"
import { boopReceiptService, simulationCache } from "#lib/services"
import { Onchain } from "#lib/types"
import type { ReceiptRequestInput } from "./types"

export async function waitForReceipt({
    hash,
    timeout,
}: ReceiptRequestInput): Promise<Result<StateRequestOutput, StateRequestOutput>> {
    const receipt = await boopReceiptService.findByBoopHashWithTimeout(hash, timeout ?? env.RECEIPT_TIMEOUT)
    if (receipt?.status === Onchain.Success) {
        return ok({
            status: StateRequestStatus.Success,
            state: { status: receipt.status, included: true, receipt: receipt },
        } satisfies StateRequestOutput)
    }

    const simulation = await simulationCache.findSimulation(hash)
    if (simulation) {
        return ok({
            status: StateRequestStatus.Success,
            // TODO must check scenarios here
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            state: { status: simulation.status as any, included: false, simulation },
        } satisfies StateRequestOutput)
    }

    return err({ status: StateRequestStatus.UnknownBoop } satisfies StateRequestOutput)
}
