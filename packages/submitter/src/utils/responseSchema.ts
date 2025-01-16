import type { Address, Hex } from "viem"
import { z } from "zod"

export const BaseDeployAccountResponseSchema = z.object({
    success: z.boolean(),
})

export const DeployAccountSuccessSchema = BaseDeployAccountResponseSchema.extend({
    success: z.literal(true),
    message: z.string(),
    accountAddress: z
        .string()
        .regex(/^0x[0-9a-fA-F]{40}$/)
        .transform((val) => val as Address),
    owner: z
        .string()
        .regex(/^0x[0-9a-fA-F]{40}$/)
        .transform((val) => val as Address),
    transactionHash: z
        .string()
        .regex(/^0x[0-9a-fA-F]{64}$/)
        .transform((val) => val as Hex),
})

export const DeployAccountErrorSchema = BaseDeployAccountResponseSchema.extend({
    success: z.literal(false),
    transactionHash: z
        .string()
        .regex(/^0x[0-9a-fA-F]{64}$/)
        .transform((val) => val as Hex)
        .optional(),
    error: z.string(),
})

export const DeployAccountResponseSchema = z.discriminatedUnion("success", [
    DeployAccountSuccessSchema,
    DeployAccountErrorSchema,
])

export const SubmitHappyTxResponseSchema = z.object({
    txHash: z
        .string()
        .regex(/^0x[0-9a-fA-F]{64}$/)
        .transform((val) => val as Hex),
    success: z.boolean(),
})

export type DeployAccountResponse = z.infer<typeof DeployAccountResponseSchema>
export type SubmitHappyTxResponse = z.infer<typeof SubmitHappyTxResponseSchema>
