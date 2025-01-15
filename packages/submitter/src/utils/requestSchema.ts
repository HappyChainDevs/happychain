import { z } from "zod"

export const DeployAccountSchema = z.object({
    factoryAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    salt: z.string().regex(/^0x[0-9a-fA-F]+$/),
})

export const HappyTxSchema = z.object({
    encodedTx: z.string().regex(/^0x[0-9a-fA-F]+$/),
})

export type DeployAccountRequest = z.infer<typeof DeployAccountSchema>
export type HappyTxRequest = z.infer<typeof HappyTxSchema>
