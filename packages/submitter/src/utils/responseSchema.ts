import type { Hex } from "viem"
import { z } from "zod"

export const CreateAccountResponseSchema = z.object({
    accountAddress: z
        .string()
        .regex(/^0x[0-9a-fA-F]{40}$/)
        .transform((val) => val as Hex),
    factoryAddress: z
        .string()
        .regex(/^0x[0-9a-fA-F]{40}$/)
        .transform((val) => val as Hex),
    success: z.boolean(),
})

export const SubmitHappyTxResponseSchema = z.object({
    txHash: z
        .string()
        .regex(/^0x[0-9a-fA-F]{64}$/)
        .transform((val) => val as Hex),
    success: z.boolean(),
})

export type CreateAccountResponse = {
    accountAddress: Hex
    factoryAddress: Hex
    success: boolean
}

export type SubmitHappyTxResponse = {
    txHash: Hex
    success: boolean
}
