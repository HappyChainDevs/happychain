import { type Result, err, ok } from "neverthrow"
import { DEFAULT_RECEIPT_TIMEOUT_MS } from "#lib/data/defaults"
import { type StateRequestOutput, StateRequestStatus } from "#lib/interfaces/BoopState"
import type { ReceiptRequestInput } from "#lib/interfaces/boop_receipt"
import { EntryPointStatus } from "#lib/interfaces/status"
import { boopReceiptService, boopSimulationService } from "#lib/services"

export async function receiptByHash({
    hash,
    timeout,
}: ReceiptRequestInput): Promise<Result<StateRequestOutput, StateRequestOutput>> {
    const receipt = await boopReceiptService.findByBoopHashWithTimeout(hash, timeout ?? DEFAULT_RECEIPT_TIMEOUT_MS)
    if (receipt?.status === EntryPointStatus.Success) {
        return ok({
            status: StateRequestStatus.Success,
            state: { status: receipt.status, included: true, receipt: receipt },
        } satisfies StateRequestOutput)
    }

    const simulation = await boopSimulationService.findResultByBoopHash(hash)

    if (simulation?.status) {
        return ok({
            status: StateRequestStatus.Success,
            state: { status: simulation.status, included: false, simulation },
        } satisfies StateRequestOutput)
    }

    return err({ status: StateRequestStatus.UnknownBoop } satisfies StateRequestOutput)
}
