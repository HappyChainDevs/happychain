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

export const BaseSubmitHappyTxResponseSchema = z.object({
    success: z.boolean(),
})

export const SubmitHappyTxSuccessSchema = BaseSubmitHappyTxResponseSchema.extend({
    success: z.literal(true),
    message: z.string(),
    txHash: z
        .string()
        .regex(/^0x[0-9a-fA-F]{64}$/)
        .transform((val) => val as Hex),
})

export const SubmitHappyTxErrorSchema = BaseSubmitHappyTxResponseSchema.extend({
    success: z.literal(false),
    error: z.string(),
    txHash: z
        .string()
        .regex(/^0x[0-9a-fA-F]{64}$/)
        .transform((val) => val as Hex)
        .optional(),
})

export const SubmitHappyTxResponseSchema = z.discriminatedUnion("success", [
    SubmitHappyTxSuccessSchema,
    SubmitHappyTxErrorSchema,
])

export type DeployAccountResponse =
    | {
          owner: Hex
          message: string
          success: true
          accountAddress: Hex
          transactionHash: Hex
      }
    | {
          error: string
          success: false
          transactionHash?: Hex | undefined
      }

export type SubmitHappyTxResponse =
    | {
          success: true
          message: string
          txHash: Hex
      }
    | {
          success: false
          error: string
          txHash?: Hex | undefined
      }
