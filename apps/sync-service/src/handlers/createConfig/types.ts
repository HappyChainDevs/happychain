import type { z } from "zod"
import type { inputSchema, outputSchema } from "./validation"

export type CreateConfigInput = z.infer<typeof inputSchema>
export type CreateConfigOutput = z.infer<typeof outputSchema>
