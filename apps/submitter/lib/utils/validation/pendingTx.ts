import { z } from "zod"
import { isHexString } from "#lib/utils/validation/isHexString"

export const pendingTxSchema = z.object({
    boopHash: z
        .string()
        .refine(isHexString)
        .openapi({ example: "0x94a74bd4134a27b08745dba20ec7f23fc5321e268781edadc50acfb7b9d900f9" }),
    nonceTrack: z.string().openapi({ example: "0" }),
    nonceValue: z.string().openapi({ example: "0" }),
    submitted: z.boolean().openapi({ example: false }),
})
