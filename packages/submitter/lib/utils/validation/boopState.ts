import { z } from "zod"
import { simulateOutputSchema } from "#lib/handlers/simulate/simulateValidation"
import { Onchain } from "#lib/types"
import { SubmitterError } from "#lib/types"
import { boopReceiptSchema } from "./boopReceipt"

const BoopStateSubmitterErrorSchema = z.object({
    status: z.enum([
        SubmitterError.BufferExceeded,
        SubmitterError.OverCapacity,
        SubmitterError.UnexpectedError,
        SubmitterError.SimulationTimeout,
    ]),
    included: z.literal(undefined),
})

const BoopStateEntryPointErrorSchema = z.object({
    status: z.enum([
        // EntryPointStatus
        Onchain.Success,
        Onchain.ValidationReverted,
        Onchain.ValidationRejected,
        Onchain.ExecuteReverted,
        Onchain.ExecuteRejected,
        Onchain.PaymentValidationReverted,
        Onchain.PayoutFailed,
        Onchain.UnexpectedReverted,
        SubmitterError.SubmitTimeout,
        SubmitterError.ReceiptTimeout,
    ]),
    included: z.literal(false),
    simulation: simulateOutputSchema.optional(),
})

const BoopStateSuccessSchema = z.object({
    status: z.literal(Onchain.Success).openapi({ example: Onchain.Success }),
    included: z.literal(true).openapi({ example: true }),
    receipt: boopReceiptSchema,
})

export const boopStateSchema = z.discriminatedUnion("included", [
    BoopStateSuccessSchema,
    BoopStateEntryPointErrorSchema,
    BoopStateSubmitterErrorSchema,
])
