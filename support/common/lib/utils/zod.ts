import type { Hex } from "viem"
import { z } from "zod"

export const hexSchema = z
    .string()
    .trim()
    .refine((s) => s.startsWith("0x"), {
        message: "Hex string must start with 0x",
    })
    .transform((hex) => hex as Hex)
