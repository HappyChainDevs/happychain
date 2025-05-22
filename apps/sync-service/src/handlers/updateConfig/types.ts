import type { z } from "zod"
import type { inputSchema, outputSchema } from "./validation"

export type UpdateConfigInput = z.infer<typeof inputSchema>
export type UpdateConfigOutput = z.infer<typeof outputSchema>
