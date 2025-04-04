import { z } from "zod"
import { EntryPointStatus, SubmitterErrorStatus } from "#lib/tmp/interface/status"
import { happyReceiptSchema } from "./happyReceipt"
import { simulationResultSchema } from "./simulationResult"

const HappyTxStateSubmitterErrorSchema = z.object({
    status: z.enum([
        SubmitterErrorStatus.BufferExceeded,
        SubmitterErrorStatus.OverCapacity,
        SubmitterErrorStatus.UnexpectedError,
        SubmitterErrorStatus.SimulationTimeout,
    ]),
    included: z.literal(undefined),
})

const HappyTxStateEntryPointErrorSchema = z.object({
    status: z.enum([
        // EntryPointStatus
        EntryPointStatus.Success,
        EntryPointStatus.ValidationReverted,
        EntryPointStatus.ValidationFailed,
        EntryPointStatus.ExecuteReverted,
        EntryPointStatus.ExecuteFailed,
        EntryPointStatus.PaymentValidationReverted,
        EntryPointStatus.PaymentFailed,
        EntryPointStatus.UnexpectedReverted,
        // SubmitterErrorSimulationMaybeAvailable
        SubmitterErrorStatus.SubmitTimeout,
        SubmitterErrorStatus.ReceiptTimeout,
    ]),
    included: z.literal(false),
    simulation: simulationResultSchema.optional(),
})

const HappyTxStateSuccessSchema = z.object({
    status: z.literal(EntryPointStatus.Success).openapi({ example: EntryPointStatus.Success }),
    included: z.literal(true).openapi({ example: true }),
    receipt: happyReceiptSchema,
})

export const happyTxStateSchema = z.discriminatedUnion("included", [
    HappyTxStateSuccessSchema,
    HappyTxStateEntryPointErrorSchema,
    HappyTxStateSubmitterErrorSchema,
])
