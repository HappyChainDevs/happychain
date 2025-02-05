import type { Hex } from "viem"
import { z } from "zod"

export const DeployAccountSchema = z.object({
    owner: z
        .string()
        .regex(/^0x[0-9a-fA-F]{40}$/)
        .transform((val) => val as Hex),
    salt: z
        .string()
        .regex(/^0x[0-9a-fA-F]+$/)
        .transform((val) => val as Hex),
})

export const HappyTxSchema = z.object({
    encodedHappyTx: z
        .string()
        .regex(/^0x[0-9a-fA-F]+$/)
        .transform((val) => val as Hex),
})

export type DeployAccountRequest = {
    owner: Hex
    salt: Hex
}

export type HappyTxRequest = {
    encodedHappyTx: Hex
}
