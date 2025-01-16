import type { Hex } from "viem"
import { z } from "zod"

export const DeployAccountSchema = z.object({
    owner: z.string().regex(/^0x[0-9a-fA-F]{40}$/).transform((val) => val as Hex),
    salt: z.string().regex(/^0x[0-9a-fA-F]+$/).transform((val) => val as Hex),
})

export const HappyTxSchema = z.object({
    encodedTx: z.string().regex(/^0x[0-9a-fA-F]+$/),
})

export type DeployAccountRequest = z.infer<typeof DeployAccountSchema>
export type HappyTxRequest = z.infer<typeof HappyTxSchema>
