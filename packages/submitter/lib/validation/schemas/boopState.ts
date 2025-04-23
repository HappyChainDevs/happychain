import { z } from "zod"
import { EntryPointStatus, SubmitterErrorStatus } from "#lib/interfaces/status"
import { boopReceiptSchema } from "./boopReceipt"
import { simulationResultSchema } from "./simulationResult"

const BoopStateSubmitterErrorSchema = z.object({
    status: z.enum([
        SubmitterErrorStatus.BufferExceeded,
        SubmitterErrorStatus.OverCapacity,
        SubmitterErrorStatus.UnexpectedError,
        SubmitterErrorStatus.SimulationTimeout,
    ]),
    included: z.literal(undefined),
})

const BoopStateEntryPointErrorSchema = z.object({
    status: z.enum([
        // EntryPointStatus
        EntryPointStatus.Success,
        EntryPointStatus.ValidationReverted,
        EntryPointStatus.ValidationFailed,
        EntryPointStatus.ExecuteReverted,
        EntryPointStatus.ExecuteFailed,
        EntryPointStatus.PaymentValidationReverted,
        EntryPointStatus.PayoutFailed,
        EntryPointStatus.UnexpectedReverted,
        // SubmitterErrorSimulationMaybeAvailable
        SubmitterErrorStatus.SubmitTimeout,
        SubmitterErrorStatus.ReceiptTimeout,
    ]),
    included: z.literal(false),
    simulation: simulationResultSchema.optional(),
})

const BoopStateSuccessSchema = z.object({
    status: z.literal(EntryPointStatus.Success).openapi({ example: EntryPointStatus.Success }),
    included: z.literal(true).openapi({ example: true }),
    receipt: boopReceiptSchema,
})

export const boopStateSchema = z.discriminatedUnion("included", [
    BoopStateSuccessSchema,
    BoopStateEntryPointErrorSchema,
    BoopStateSubmitterErrorSchema,
])
