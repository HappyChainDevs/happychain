import type { z } from "zod"
import type { inputSchema, outputSchema } from "./validation"

export type ListConfigInput = z.infer<typeof inputSchema>
export type ListConfigOutput = z.infer<typeof outputSchema>
