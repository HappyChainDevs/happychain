import { z } from "zod"
import { deployment } from "#lib/deployments"
import { EntryPointStatus, SimulatedValidationStatus } from "#lib/tmp/interface/status"
import { isAddress } from "#lib/utils/zod/refines/isAddress"
import { isHexString } from "#lib/utils/zod/refines/isHexString"

const validationStatus = z.enum([
    SimulatedValidationStatus.Success,
    SimulatedValidationStatus.Unknown,
    SimulatedValidationStatus.FutureNonce,
    SimulatedValidationStatus.Reverted,
    SimulatedValidationStatus.Failed,
    SimulatedValidationStatus.UnexpectedReverted,
])

const simulationResultSuccessSchema = z.object({
    status: z.literal(EntryPointStatus.Success).openapi({
        example: EntryPointStatus.Success,
    }),
    validationStatus: validationStatus.openapi({
        example: SimulatedValidationStatus.Success,
    }),
    entryPoint: z.string().refine(isAddress).openapi({
        example: deployment.HappyEntryPoint,
    }),
})

const simulationResultFailureSchema = z.object({
    status: z.enum([
        //
        EntryPointStatus.ValidationFailed,
        EntryPointStatus.ExecuteFailed,
        EntryPointStatus.PaymentFailed,
    ]),
    validationStatus: validationStatus,
    entryPoint: z.string().refine(isAddress),
    revertData: z.string().refine(isHexString),
})

const simulationResultRevertSchema = z.object({
    status: z.enum([
        EntryPointStatus.ValidationReverted,
        EntryPointStatus.ExecuteReverted,
        EntryPointStatus.PaymentReverted,
        EntryPointStatus.UnexpectedReverted,
    ]),
    validationStatus: validationStatus,
    entryPoint: z.string().refine(isAddress),
    revertData: z.string().refine(isHexString),
})

export const simulationResultSchema = z.discriminatedUnion("status", [
    simulationResultSuccessSchema,
    simulationResultFailureSchema,
    simulationResultRevertSchema,
])
